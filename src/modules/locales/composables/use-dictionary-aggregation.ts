/**
 * @module
 * Composable owning the dictionary board's three-source read model: entries, the API baseline,
 * the bundled baseline and pending keys, merged into per-cell lookups the board and the cell
 * editor both read through rather than touching the sources directly.
 */
import { computed, ref, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useLocalesStore } from '../store.ts';
import { refreshRunningLocale } from '@/infrastructure/locale-overrides.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { LocaleAppKind } from '@api';
import type { LocaleEntry } from '@types';

/**
 * The dictionary board's three-source aggregation: stored entries, the API's deployed baseline,
 * this build's bundled baseline, and keys added on the page but not yet backed by an entry
 * anywhere. Every other concern on the board — filtering, pagination, per-cell writes — asks a
 * cell's state through this rather than reading the three sources directly, so "what is this
 * cell" has exactly one answer regardless of who is asking.
 *
 * @param app - Whose dictionary is on the board; a key lives in exactly one app. Owned by
 *  the caller, not here — switching it is a page-level action with page-level side effects
 *  (resetting the current page, drafts) beyond what this aggregation is responsible for.
 */
export function useDictionaryAggregation(app: Ref<string>) {
    /** Toast dispatcher for load failures. */
    const { addMessage } = useNotificationsStore();

    /** Locales store: the language manifest and app registry the board reads. */
    const localesStore = useLocalesStore();

    /** Reactive capabilities, apps and loading flag taken off {@link localesStore}. */
    const { capabilities, apps, loading } = storeToRefs(localesStore);

    /**
     * What kind of app is on the board — decides which baseline, if any, the cells show.
     */
    const appKind = computed(
        () => apps.value.find(({ id }) => id === app.value)?.kind ?? LocaleAppKind.frontend
    );

    /**
     * Whether the shown app has a baseline this build can read: its own bundle, or the API's files.
     */
    const hasBaseline = computed(
        () => app.value === localesStore.ownApp || appKind.value === LocaleAppKind.backend
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
     * The app select's options, from the registry.
     */
    const appOptions = computed(() =>
        apps.value.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
    );

    /**
     * Every entry of every language, every app, by language tag.
     */
    const entriesByTag = ref<Partial<Record<string, LocaleEntry[]>>>({});

    /**
     * The API's deployed dictionary by language tag — the backend app's baseline.
     */
    const apiBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

    /**
     * This build's bundled dictionary by language tag — its own app's baseline.
     */
    const appBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

    /**
     * Keys added on this page that have no entry in any language yet.
     */
    const pendingKeys = ref<string[]>([]);

    /**
     * One language's entries of the shown app, by key.
     */
    const entriesIndex = computed(() => {
        const index: Partial<Record<string, Map<string, LocaleEntry>>> = {};
        for (const [tag, entries] of Object.entries(entriesByTag.value))
            index[tag] = new Map(
                (entries ?? [])
                    .filter((entry) => entry.app === app.value)
                    .map((entry) => [entry.key, entry])
            );
        return index;
    });

    /**
     * The shown app's baselines, by language tag — none for an app this build cannot read.
     */
    const baselines = computed<Partial<Record<string, Partial<Record<string, string>>>>>(() => {
        if (app.value === localesStore.ownApp) return appBaselines.value;
        if (appKind.value === LocaleAppKind.backend) return apiBaselines.value;
        return {};
    });

    /**
     * The stored entry for one cell, when there is one.
     */
    const entryAt = (tag: string, key: string): LocaleEntry | undefined =>
        entriesIndex.value[tag]?.get(key);

    /**
     * The baseline text for one cell, when the shown app has one.
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
     * Every key on the board: the union, across languages, of the shown app's baseline keys and
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
        Promise.all([localesStore.fetchApps(), localesStore.fetchLanguages()])
            .then(() => Promise.all(languages.value.map((language) => loadLanguage(language.tag))))
            .catch((error: unknown) => notifyErrorMessages(addMessage, error));

    /**
     * What every write does afterwards: the column, the manifest's counts, the running app.
     */
    const afterWrite = (tag: string) =>
        Promise.all([loadLanguage(tag), localesStore.fetchLanguages(), refreshRunningLocale(tag)]);

    /**
     * Records a key added here, not yet backed by an entry anywhere — see `allKeys`.
     */
    const addPendingKey = (key: string) => {
        pendingKeys.value.push(key);
    };

    /**
     * Forgets this app's added-but-unsaved keys — an app switch is a different board.
     */
    const resetPendingKeys = () => {
        pendingKeys.value = [];
    };

    return {
        loading,
        appKind,
        hasBaseline,
        languages,
        appOptions,
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
