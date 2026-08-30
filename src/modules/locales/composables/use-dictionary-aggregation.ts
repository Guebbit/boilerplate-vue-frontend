/**
 * @module
 * Composable owning the dictionary board's three-source read model: entries, the API baseline,
 * the bundled baseline and pending keys, merged into per-cell lookups the board and the cell
 * editor both read through rather than touching the sources directly.
 */
import { computed, ref, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { updateLocale as applyDictionary } from '@/infrastructure/i18n';
import { fetchLocaleOverrides } from '@/infrastructure/i18n/locale-overrides.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { LocaleTenantKind } from '@types';
import type { LocaleEntry } from '@types';

/**
 * Refreshes the running app's copy of one language after a write, so the edit is visible now.
 *
 * Resolves regardless: the board's own state is already correct, and the live refresh is a
 * courtesy that must never turn a saved edit into an error toast.
 */
const applyLiveOverrides = (tag: string) =>
    fetchLocaleOverrides(tag)
        .then((messages) => applyDictionary(tag, messages))
        .catch(() => undefined);

/**
 * The dictionary board's three-source aggregation: stored entries, the API's deployed baseline,
 * this build's bundled baseline, and keys added on the page but not yet backed by an entry
 * anywhere. Every other concern on the board — filtering, pagination, per-cell writes — asks a
 * cell's state through this rather than reading the three sources directly, so "what is this
 * cell" has exactly one answer regardless of who is asking.
 *
 * @param tenant - Whose dictionary is on the board; a key lives in exactly one tenant. Owned by
 *  the caller, not here — switching it is a page-level action with page-level side effects
 *  (resetting the current page, drafts) beyond what this aggregation is responsible for.
 */
export function useDictionaryAggregation(tenant: Ref<string>) {
    const { addMessage } = useNotificationsStore();
    const localesStore = useLocalesStore();
    const { capabilities, tenants, loading } = storeToRefs(localesStore);

    /**
     * What kind of tenant is on the board — decides which baseline, if any, the cells show.
     */
    const tenantKind = computed(
        () => tenants.value.find(({ id }) => id === tenant.value)?.kind ?? LocaleTenantKind.frontend
    );

    /**
     * Whether the shown tenant has a baseline this build can read: its own bundle, or the API's files.
     */
    const hasBaseline = computed(
        () =>
            tenant.value === localesStore.ownTenant || tenantKind.value === LocaleTenantKind.backend
    );

    /**
     * Languages the board can write to: the ones with a dynamic record behind them.
     *
     * A `static`-only language exists as deployed files alone; there is no entries collection to put
     * a cell into, so it is not a column.
     */
    const languages = computed(() =>
        capabilities.value.filter((language) => language.source !== 'static')
    );

    /**
     * The tenant select's options, from the registry.
     */
    const tenantOptions = computed(() =>
        tenants.value.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
    );

    /**
     * Every entry of every language, every tenant, by language tag.
     */
    const entriesByTag = ref<Partial<Record<string, LocaleEntry[]>>>({});

    /**
     * The API's deployed dictionary by language tag — the backend tenant's baseline.
     */
    const apiBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

    /**
     * This build's bundled dictionary by language tag — its own tenant's baseline.
     */
    const appBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

    /**
     * Keys added on this page that have no entry in any language yet.
     */
    const pendingKeys = ref<string[]>([]);

    /**
     * One language's entries of the shown tenant, by key.
     */
    const entriesIndex = computed(() => {
        const index: Partial<Record<string, Map<string, LocaleEntry>>> = {};
        for (const [tag, entries] of Object.entries(entriesByTag.value))
            index[tag] = new Map(
                (entries ?? [])
                    .filter((entry) => entry.tenant === tenant.value)
                    .map((entry) => [entry.key, entry])
            );
        return index;
    });

    /**
     * The shown tenant's baselines, by language tag — none for a tenant this build cannot read.
     */
    const baselines = computed<Partial<Record<string, Partial<Record<string, string>>>>>(() => {
        if (tenant.value === localesStore.ownTenant) return appBaselines.value;
        if (tenantKind.value === LocaleTenantKind.backend) return apiBaselines.value;
        return {};
    });

    /**
     * The stored entry for one cell, when there is one.
     */
    const entryAt = (tag: string, key: string): LocaleEntry | undefined =>
        entriesIndex.value[tag]?.get(key);

    /**
     * The baseline text for one cell, when the shown tenant has one.
     */
    const baselineAt = (tag: string, key: string): string | undefined =>
        baselines.value[tag]?.[key];

    /**
     * A cell with neither an entry nor a baseline: the gap the board exists to show.
     */
    const isMissing = (tag: string, key: string) =>
        entryAt(tag, key) === undefined && baselineAt(tag, key) === undefined;

    /**
     * The cell's state, for its look and its title.
     */
    const cellState = (tag: string, key: string): 'entry' | 'baseline' | 'missing' => {
        if (entryAt(tag, key)) return 'entry';
        return baselineAt(tag, key) === undefined ? 'missing' : 'baseline';
    };

    /**
     * Every key on the board: the union, across languages, of the shown tenant's baseline keys and
     * entry keys, plus what was added here and not yet saved anywhere, sorted so related keys sit
     * together.
     */
    const allKeys = computed(() => {
        const keys = new Set<string>(pendingKeys.value);
        for (const index of Object.values(entriesIndex.value))
            for (const key of index?.keys() ?? []) keys.add(key);
        for (const baseline of Object.values(baselines.value))
            for (const key of Object.keys(baseline ?? {})) keys.add(key);
        return [...keys].toSorted();
    });

    /**
     * Per language: how many of the board's keys it is missing.
     */
    const missingByTag = computed<Partial<Record<string, number>>>(() =>
        Object.fromEntries(
            languages.value.map((language) => [
                language.tag,
                allKeys.value.filter((key) => isMissing(language.tag, key)).length
            ])
        )
    );

    /**
     * Reloads one language's column: its rows and both baselines.
     */
    const loadLanguage = (tag: string) =>
        Promise.all([
            localesStore.fetchAllEntries(tag),
            localesStore.fetchApiDictionary(tag),
            localesStore.fetchBundledDictionary(tag)
        ]).then(([entries, apiBaseline, appBaseline]) => {
            entriesByTag.value[tag] = entries ?? [];
            apiBaselines.value[tag] = apiBaseline;
            appBaselines.value[tag] = appBaseline;
        });

    /**
     * Loads the registry and the manifest, then every writable language's column.
     */
    const loadBoard = () =>
        Promise.all([localesStore.fetchTenants(), localesStore.fetchLanguages()])
            .then(() => Promise.all(languages.value.map((language) => loadLanguage(language.tag))))
            .catch((error: unknown) => notifyErrorMessages(addMessage, error));

    /**
     * What every write does afterwards: the column, the manifest's counts, the running app.
     */
    const afterWrite = (tag: string) =>
        Promise.all([loadLanguage(tag), localesStore.fetchLanguages(), applyLiveOverrides(tag)]);

    /**
     * Records a key added here, not yet backed by an entry anywhere — see `allKeys`.
     */
    const addPendingKey = (key: string) => {
        pendingKeys.value.push(key);
    };

    /**
     * Forgets this tenant's added-but-unsaved keys — a tenant switch is a different board.
     */
    const resetPendingKeys = () => {
        pendingKeys.value = [];
    };

    return {
        loading,
        tenantKind,
        hasBaseline,
        languages,
        tenantOptions,
        allKeys,
        missingByTag,
        entryAt,
        baselineAt,
        isMissing,
        cellState,
        loadBoard,
        loadLanguage,
        afterWrite,
        addPendingKey,
        resetPendingKeys
    };
}
