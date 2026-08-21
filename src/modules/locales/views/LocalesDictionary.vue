<script lang="ts">
export default {
    name: 'LocalesDictionaryPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowLeft, Plus, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { updateLocale as applyDictionary } from '@/infrastructure/i18n';
import { fetchLocaleOverrides } from '@/infrastructure/i18n/locale-overrides.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { LocaleScope } from '@types';
import type { LocaleCapability, LocaleEntry, LocaleScope as TLocaleScope } from '@types';

/**
 * The dictionary board: every key down the side, every language across the top, one cell each.
 *
 * The entries page edits ONE language at a time, which is how a translator works through a
 * backlog. This is the other view of the same rows — the one a reviewer wants, where a key missing
 * in two languages out of five is visible as two empty cells on one line rather than as two
 * absences on two separate pages. Nothing is stored differently: a cell IS an entry, keyed by
 * (language, scope, key), and every write goes through the same store calls the entries page uses.
 *
 * Empty cells in the `api` scope show the API's deployed text as a placeholder — what the entry
 * would override. For `app` rows there is no such baseline to show: the client's bundled copy is
 * not a thing the API knows, and loading every module's dictionary for every language just to
 * grey it into a cell is not worth what it costs on boot.
 *
 * Paged client-side. A whole language is a few hundred rows at most and the export already pages
 * it to completion, so this reuses that read per language rather than inventing a matrix endpoint
 * the contract does not have.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const localesStore = useLocalesStore();
const { capabilities, loading } = storeToRefs(localesStore);

/** Rows per page of the board. */
const PAGE_SIZE = 25;

/** Which of the two dictionaries the board shows; a key lives in exactly one. */
const scope = ref<TLocaleScope>(LocaleScope.app);

/** Client-side text filter over keys and values. */
const filterText = ref('');

/** The filter as last submitted, so typing does not reshuffle the board under the cursor. */
const appliedFilter = ref('');

const pageCurrent = ref(1);

/** Every entry of every language, both scopes, by language tag. */
const entriesByTag = ref<Partial<Record<string, LocaleEntry[]>>>({});

/** The API's deployed dictionary by language tag — the `api` scope's baseline. */
const apiBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

/** Keys added on this page that have no entry in any language yet. */
const pendingKeys = ref<string[]>([]);

const newKey = ref('');

const languageFormOpen = ref(false);

/** Local draft per cell, so a blur can tell "changed" from "clicked through". */
const drafts = ref<Partial<Record<string, string>>>({});

/** Drops one cell's draft, so the cell reads the stored value again. */
const forgetDraft = (id: string) => {
    drafts.value = Object.fromEntries(Object.entries(drafts.value).filter(([k]) => k !== id));
};

/**
 * Languages the board can write to: the ones with a dynamic record behind them.
 *
 * A `static`-only language exists as deployed files alone; there is no entries collection to put
 * a cell into, so it is not a column.
 */
const languages = computed(() =>
    capabilities.value.filter((language) => language.source !== 'static')
);

const scopeOptions = computed(() =>
    Object.values(LocaleScope).map((value) => ({
        value,
        title: t(`locale-entries-page.scope-${value}`)
    }))
);

/** The cell's draft key: tag and key joined by a separator no BCP 47 tag can contain. */
const cellId = (tag: string, key: string) => `${tag}|${key}`;

/** One language's entries of the shown scope, by key. */
const entriesIndex = computed(() => {
    const index: Partial<Record<string, Map<string, LocaleEntry>>> = {};
    for (const [tag, entries] of Object.entries(entriesByTag.value))
        index[tag] = new Map(
            (entries ?? [])
                .filter((entry) => entry.scope === scope.value)
                .map((entry) => [entry.key, entry])
        );
    return index;
});

const entryAt = (tag: string, key: string): LocaleEntry | undefined =>
    entriesIndex.value[tag]?.get(key);

const baselineAt = (tag: string, key: string): string | undefined =>
    scope.value === LocaleScope.api ? apiBaselines.value[tag]?.[key] : undefined;

/**
 * Every key on the board: the union across languages of the shown scope, plus what was added
 * here and not yet saved anywhere, sorted so related keys sit together.
 */
const allKeys = computed(() => {
    const keys = new Set<string>(pendingKeys.value);
    for (const index of Object.values(entriesIndex.value))
        for (const key of index?.keys() ?? []) keys.add(key);
    return [...keys].toSorted();
});

/** The keys matching the applied filter, searched across the key and every language's value. */
const filteredKeys = computed(() => {
    const needle = appliedFilter.value.trim().toLowerCase();
    if (needle === '') return allKeys.value;
    return allKeys.value.filter(
        (key) =>
            key.toLowerCase().includes(needle) ||
            languages.value.some((language) =>
                entryAt(language.tag, key)?.value.toLowerCase().includes(needle)
            )
    );
});

const pageTotal = computed(() => Math.max(1, Math.ceil(filteredKeys.value.length / PAGE_SIZE)));

/** Rows of the current page. The row object carries the key only; cells read the index. */
const pageRows = computed(() =>
    filteredKeys.value
        .slice((pageCurrent.value - 1) * PAGE_SIZE, pageCurrent.value * PAGE_SIZE)
        .map((key) => ({ key }))
);

const tableHeaders = computed<CoreDataTableHeader<{ key: string }>[]>(() => [
    { title: t('locales-dictionary-page.column-key'), key: 'key' },
    ...languages.value.map((language) => ({
        title: `${language.nativeName} (${language.tag})`,
        key: language.tag,
        synthetic: true as const
    }))
]);

/** Reloads one language's column: its rows and, for the `api` scope, its deployed baseline. */
const loadLanguage = (tag: string) =>
    Promise.all([localesStore.fetchAllEntries(tag), localesStore.fetchApiDictionary(tag)]).then(
        ([entries, baseline]) => {
            entriesByTag.value[tag] = entries ?? [];
            apiBaselines.value[tag] = baseline;
        }
    );

/** Loads the manifest, then every writable language's column. */
const loadBoard = () =>
    localesStore
        .fetchLanguages()
        .then(() => Promise.all(languages.value.map((language) => loadLanguage(language.tag))))
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

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

/** What every write does afterwards: the column, the manifest's counts, the running app. */
const afterWrite = (tag: string) =>
    Promise.all([loadLanguage(tag), localesStore.fetchLanguages(), applyLiveOverrides(tag)]);

/**
 * Saves one cell on blur — if it actually changed.
 *
 * Three outcomes, decided by what the cell held and what it holds now: a new value over an empty
 * cell CREATES the entry, a different value EDITS it, and an emptied cell REMOVES it — after a
 * confirmation, because an accidental select-all-and-delete must cost a click, not a translation.
 *
 * @param language - The column.
 * @param key - The row.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleCellBlur = (language: LocaleCapability, key: string) => {
    const id = cellId(language.tag, key);
    const draft = drafts.value[id];
    const current = entryAt(language.tag, key);
    if (draft === undefined || draft === (current?.value ?? '')) return;

    const named = { key, language: language.nativeName };
    let request: Promise<unknown>;
    if (current && draft === '') {
        if (!globalThis.confirm(t('locales-dictionary-page.confirm-clear', named))) {
            forgetDraft(id);
            return;
        }
        request = localesStore
            .removeEntry(language.tag, current.id)
            .then(() => addMessage(t('locales-dictionary-page.success-remove')));
    } else if (current) {
        request = localesStore
            .editEntry(language.tag, current.id, draft)
            .then(() => addMessage(t('locales-dictionary-page.success-save')));
    } else if (draft === '') {
        return;
    } else {
        request = localesStore
            .addEntry(language.tag, { scope: scope.value, key, value: draft })
            .then(() => addMessage(t('locales-dictionary-page.success-save')));
    }
    return request
        .then(() => {
            forgetDraft(id);
            return afterWrite(language.tag);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Adds a row to the board. Nothing is written: the key only exists once a cell is filled, which
 * is also how the API sees it — there is no "key" record, only entries that happen to share one.
 */
const handleAddKey = () => {
    const key = newKey.value.trim();
    if (key === '') return;
    if (allKeys.value.includes(key)) {
        addMessage(t('locales-dictionary-page.error-key-exists'));
        return;
    }
    pendingKeys.value.push(key);
    newKey.value = '';
    appliedFilter.value = '';
    filterText.value = '';
    // Land on the page the new row sorted into, so the translator sees where to type.
    pageCurrent.value = Math.floor(allKeys.value.indexOf(key) / PAGE_SIZE) + 1;
};

const handleSearch = () => {
    appliedFilter.value = filterText.value;
    pageCurrent.value = 1;
};

const handleCreateLanguage = (fields: {
    tag: string;
    name: string;
    nativeName: string;
    direction: LocaleCapability['direction'];
    active: boolean;
}) =>
    localesStore
        .createLanguage(fields)
        .then(() => {
            languageFormOpen.value = false;
            addMessage(t('locales-dictionary-page.success-language'));
            return loadLanguage(fields.tag);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

// A scope switch is a different board: different keys, different page count, stale drafts.
watch(scope, () => {
    pageCurrent.value = 1;
    drafts.value = {};
    pendingKeys.value = [];
});

onMounted(() => {
    void loadBoard();
});
</script>

<template>
    <LayoutDefault id="locales-dictionary-page" :title="t('locales-dictionary-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <v-btn
                variant="text"
                data-test="back-link"
                :to="routerLinkI18n({ name: 'LocalesList' })"
            >
                <ArrowLeft :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locales-dictionary-page.back') }}
            </v-btn>
            <p class="max-w-2xl text-sm opacity-70">{{ t('locales-dictionary-page.intro') }}</p>
            <v-spacer />
            <span class="text-sm opacity-70" data-test="dictionary-key-count">
                {{ t('locales-dictionary-page.meta-keys', { count: filteredKeys.length }) }}
            </span>
            <v-btn color="primary" data-test="language-create" @click="languageFormOpen = true">
                <Plus :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locales-dictionary-page.button-add-language') }}
            </v-btn>
        </div>

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="flex flex-wrap items-center gap-3">
                    <v-text-field
                        v-model="filterText"
                        :label="t('locales-dictionary-page.filter-text')"
                        hide-details
                        class="min-w-64"
                        data-test="dictionary-filter-text"
                    />
                    <v-select
                        v-model="scope"
                        :items="scopeOptions"
                        :label="t('locales-dictionary-page.filter-scope')"
                        hide-details
                        class="max-w-64"
                        data-test="dictionary-filter-scope"
                    />
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                </div>
            </form>
            <form novalidate class="mt-3" @submit.prevent="handleAddKey">
                <div class="flex flex-wrap items-center gap-3">
                    <v-text-field
                        v-model="newKey"
                        :label="t('locales-dictionary-page.new-key-label')"
                        :hint="t('locales-dictionary-page.new-key-hint')"
                        persistent-hint
                        class="min-w-64 font-mono"
                        data-test="dictionary-new-key"
                    />
                    <v-btn type="submit" variant="tonal" data-test="dictionary-add-key">
                        <Plus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('locales-dictionary-page.button-add-key') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state
            v-if="!loading && languages.length === 0"
            :title="t('locales-dictionary-page.no-languages')"
            data-test="dictionary-no-languages"
        />

        <v-empty-state
            v-else-if="!loading && allKeys.length === 0"
            :title="t('locales-dictionary-page.empty')"
            data-test="dictionary-empty"
        />

        <div v-else class="overflow-x-auto">
            <DataTable
                :headers="tableHeaders"
                :items="pageRows"
                :loading="loading"
                :loading-text="t('generic.loading')"
                :no-data-text="t('generic.no-data')"
                item-value="key"
            >
                <template v-slot:[`item.key`]="{ item }">
                    <!-- Same native-title rule as the entries page's keys. -->
                    <span class="font-mono text-sm" :title="t('locale-entries-page.key-immutable')">
                        {{ item.key }}
                    </span>
                </template>

                <template
                    v-for="language in languages"
                    :key="language.tag"
                    v-slot:[`item.${language.tag}`]="{ item }"
                >
                    <v-text-field
                        :model-value="
                            drafts[cellId(language.tag, item.key)] ??
                            entryAt(language.tag, item.key)?.value ??
                            ''
                        "
                        :placeholder="baselineAt(language.tag, item.key)"
                        persistent-placeholder
                        :aria-label="
                            t('locales-dictionary-page.cell-label', {
                                key: item.key,
                                language: language.nativeName
                            })
                        "
                        :dir="language.direction"
                        density="compact"
                        hide-details
                        class="min-w-48"
                        data-test="dictionary-cell"
                        @update:model-value="
                            (draft) => (drafts[cellId(language.tag, item.key)] = draft)
                        "
                        @blur="handleCellBlur(language, item.key)"
                        @keydown.enter.prevent="handleCellBlur(language, item.key)"
                    />
                </template>
            </DataTable>
        </div>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />

        <LanguageFormDialog v-model="languageFormOpen" @save="handleCreateLanguage" />
    </LayoutDefault>
</template>
