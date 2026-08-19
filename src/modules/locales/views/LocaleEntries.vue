<script lang="ts">
export default {
    name: 'LocaleEntriesPage'
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowLeft, Download, Plus, Search, Upload } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { updateLocale as applyDictionary } from '@/infrastructure/i18n';
import { fetchLocaleOverrides } from '@/infrastructure/i18n/locale-overrides.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { expandEntries } from '@/modules/locales/dictionaries.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import EntryFormDialog from '@/modules/locales/components/EntryFormDialog.vue';
import EntriesImportDialog from '@/modules/locales/components/EntriesImportDialog.vue';
import { LocaleScope } from '@types';
import type { LocaleEntry, LocaleEntryInput, LocaleScope as TLocaleScope } from '@types';

/**
 * One language's translation rows: paginated, searched, edited inline.
 *
 * The row is the unit of editing — flat and dotted, exactly as stored — while the nested tree
 * stays the server's business. Keys render disabled because they ARE identity: changing one is a
 * delete plus an add, and the API refuses the shortcut.
 *
 * After every successful write the RUNNING app's dictionary for this language is refreshed from
 * the API, so an admin editing the language they are reading sees their own edit take effect
 * without a reload — the same merge path boot uses, nothing bespoke.
 */
const { t } = useI18n();
const route = useRoute();
const { addMessage } = useNotificationsStore();
const localesStore = useLocalesStore();
const { capabilities, filters, pageItemList, pageCurrent, pageTotal, loading } =
    storeToRefs(localesStore);

/** The language whose rows this page shows, from `/locales/:tag`. */
const tag = computed(() => String(route.params.tag));

/** This language's manifest row, for the header. Absent until the manifest loads. */
const capability = computed(() =>
    capabilities.value.find((language) => language.tag === tag.value)
);

const entryFormOpen = ref(false);
const importOpen = ref(false);

/** Local draft per row id, so a blur can tell "changed" from "clicked through". */
const drafts = ref<Record<string, string>>({});

const scopeFilterOptions = computed(() => [
    { value: undefined, title: t('locale-entries-page.filter-scope-all') },
    ...Object.values(LocaleScope).map((scope) => ({
        value: scope,
        title: t(`locale-entries-page.scope-${scope}`)
    }))
]);

/*
 * The tag rides INSIDE the filters so the search cache keys on it — see the store. Immediate,
 * because the first search must not fire before the tag is in place.
 */
filters.value.tag = tag.value;
const { search } = localesStore.watchSearchEntries({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

watch(tag, (nextTag) => {
    filters.value.tag = nextTag;
    pageCurrent.value = 1;
    drafts.value = {};
    void search();
});

// The header needs the manifest; harmless when the list page already loaded it.
if (capabilities.value.length === 0) void localesStore.fetchLanguages();

const handleSearch = () => {
    pageCurrent.value = 1;
    return search();
};

/**
 * Refreshes the running app's copy of this language after a write, so the edit is visible now.
 *
 * Resolves regardless: the page's own state is already correct, and the live refresh is a
 * courtesy that must never turn a saved edit into an error toast.
 */
const applyLiveOverrides = () =>
    fetchLocaleOverrides(tag.value)
        .then((messages) => applyDictionary(tag.value, messages))
        // `fetchLocaleOverrides` already never rejects; this guards the merge itself.
        .catch(() => undefined);

const handleAdd = (fields: { scope: TLocaleScope; key: string; value: string }) =>
    localesStore
        .addEntry(tag.value, fields)
        .then(() => {
            entryFormOpen.value = false;
            addMessage(t('locale-entries-page.success-add'));
            return Promise.all([search(true), applyLiveOverrides()]);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Saves one row's value on blur — if it actually changed.
 *
 * @param entry - The row as the store knows it.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleValueBlur = (entry: LocaleEntry) => {
    const draft = drafts.value[entry.id] as string | undefined;
    if (draft === undefined || draft === entry.value) return;
    return localesStore
        .editEntry(tag.value, entry.id, draft)
        .then(() => {
            addMessage(t('locale-entries-page.success-edit'));
            return applyLiveOverrides();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

const handleDelete = (entry: LocaleEntry) => {
    const shouldContinue = globalThis.confirm(
        t('locale-entries-page.confirm-delete-entry', { key: entry.key })
    );
    if (!shouldContinue) return;
    return localesStore
        .removeEntry(tag.value, entry.id)
        .then(() => {
            addMessage(t('locale-entries-page.success-delete'));
            return Promise.all([search(true), applyLiveOverrides()]);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

const handleImport = (payload: {
    mode: 'merge' | 'replace';
    scope: TLocaleScope;
    entries: LocaleEntryInput[];
}) =>
    localesStore
        .importEntries(tag.value, payload.mode, payload.scope, payload.entries)
        .then((result) => {
            importOpen.value = false;
            addMessage(t('locale-entries-page.success-import', { ...result }));
            /*
             * The contract's own assertion: a merge never deletes. A non-zero `removed` here
             * means the wrong operation ran, which is worth shouting about, not hiding.
             */
            if (payload.mode === 'merge' && result?.removed)
                addMessage(t('locale-entries-page.error-merge-removed'));
            return Promise.all([search(true), localesStore.fetchLanguages(), applyLiveOverrides()]);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Downloads the whole language as nested JSON — both scopes, paged to completion.
 *
 * Reads the entries collection rather than the messages route, which is `app`-only and invisible
 * for an inactive language; an export carries what is STORED.
 */
const handleExport = () =>
    localesStore
        .fetchAllEntries(tag.value)
        .then((allEntries) => {
            const dictionary = expandEntries(allEntries ?? []);
            const blob = new Blob([JSON.stringify(dictionary, undefined, 4)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${tag.value}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <LayoutDefault id="locale-entries-page" :title="t('locale-entries-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <v-btn
                variant="text"
                data-test="back-link"
                :to="routerLinkI18n({ name: 'LocalesList' })"
            >
                <ArrowLeft :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locale-entries-page.back') }}
            </v-btn>
            <div v-if="capability" class="flex flex-wrap items-baseline gap-2">
                <span class="font-mono text-lg font-semibold">{{ capability.tag }}</span>
                <span :dir="capability.direction">{{ capability.nativeName }}</span>
                <span class="text-sm opacity-70">
                    {{ t('locale-entries-page.meta-entries', { count: capability.entryCount }) }} ·
                    {{ t('locale-entries-page.meta-revision', { revision: capability.revision }) }}
                </span>
            </div>
            <v-spacer />
            <v-btn variant="tonal" data-test="entries-export" @click="handleExport">
                <Download :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locale-entries-page.button-export') }}
            </v-btn>
            <v-btn variant="tonal" data-test="entries-import-open" @click="importOpen = true">
                <Upload :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locale-entries-page.button-import') }}
            </v-btn>
            <v-btn color="primary" data-test="entry-create" @click="entryFormOpen = true">
                <Plus :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locale-entries-page.button-add') }}
            </v-btn>
        </div>

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="flex flex-wrap items-center gap-3">
                    <v-text-field
                        v-model="filters.text"
                        :label="t('locale-entries-page.filter-text')"
                        hide-details
                        class="min-w-64"
                        data-test="entries-filter-text"
                    />
                    <v-select
                        v-model="filters.scope"
                        :items="scopeFilterOptions"
                        :label="t('locale-entries-page.filter-scope')"
                        hide-details
                        class="max-w-64"
                        data-test="entries-filter-scope"
                    />
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state
            v-if="!loading && pageItemList.length === 0"
            :title="t('locale-entries-page.empty')"
            data-test="entries-empty"
        />

        <v-table v-else data-test="entries-table">
            <thead>
                <tr>
                    <th>{{ t('locale-entries-page.column-scope') }}</th>
                    <th>{{ t('locale-entries-page.column-key') }}</th>
                    <th class="w-2/5">{{ t('locale-entries-page.column-value') }}</th>
                    <th>{{ t('locale-entries-page.column-updated-at') }}</th>
                    <th>{{ t('locale-entries-page.column-actions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="entry in pageItemList" :key="entry.id" data-test="entry-row">
                    <td>
                        <v-chip
                            size="small"
                            variant="tonal"
                            :color="entry.scope === 'api' ? 'tertiary' : 'secondary'"
                        >
                            {{ t(`locales-list-page.scope-${entry.scope}`) }}
                        </v-chip>
                    </td>
                    <td>
                        <!-- Same native-title rule as the board's scope chips. -->
                        <span
                            class="font-mono text-sm opacity-80"
                            :title="t('locale-entries-page.key-immutable')"
                        >
                            {{ entry.key }}
                        </span>
                    </td>
                    <td>
                        <v-text-field
                            :model-value="drafts[entry.id] ?? entry.value"
                            density="compact"
                            hide-details
                            data-test="entry-value-field"
                            @update:model-value="(draft) => (drafts[entry.id] = draft)"
                            @blur="handleValueBlur(entry)"
                            @keydown.enter.prevent="handleValueBlur(entry)"
                        />
                    </td>
                    <td class="text-sm opacity-70">{{ formatDateTime(entry.updatedAt) }}</td>
                    <td>
                        <v-btn
                            size="small"
                            variant="tonal"
                            color="error"
                            data-test="entry-delete"
                            :disabled="loading"
                            @click="handleDelete(entry)"
                        >
                            {{ t('locale-entries-page.button-delete') }}
                        </v-btn>
                    </td>
                </tr>
            </tbody>
        </v-table>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />

        <EntryFormDialog v-model="entryFormOpen" :initial-scope="filters.scope" @save="handleAdd" />
        <EntriesImportDialog
            v-model="importOpen"
            :initial-scope="filters.scope"
            @import="handleImport"
        />
    </LayoutDefault>
</template>
