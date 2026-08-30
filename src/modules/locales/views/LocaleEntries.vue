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
import { omit } from 'lodash-es';
import { ArrowLeft, BookOpenText, Check, Download, Plus, Search, Upload } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { downloadBlob } from '@guebbit/js-toolkit';
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
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type { LocaleEntry, LocaleEntryInput } from '@types';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

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
const { capabilities, tenants, filters, pageItemList, pageCurrent, entriesPageTotal, loading } =
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

/** Row ids whose last save just landed; the check mark beside the field, cleared after a beat. */
const savedRows = ref<Record<string, true>>({});

/** The "every tenant" choice of the tenant select. */
const ANY_TENANT = '';

const tenantFilterOptions = computed(() => [
    /*
     * A real empty-string value, NOT `undefined`: Vuetify reads an item with no value as
     * "use the title", and the page then sent the title itself to the API.
     */
    { value: ANY_TENANT, title: t('locale-entries-page.filter-tenant-all') },
    ...tenants.value.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
]);

/** The select's model: the sentinel on screen, `undefined` — no filter — in the store. */
const tenantChoice = computed({
    get: () => filters.value.tenant ?? ANY_TENANT,
    set: (choice: string) => {
        filters.value.tenant = choice === ANY_TENANT ? undefined : choice;
    }
});

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

// The header needs the manifest and the selects the registry; harmless when the list page
// already loaded them.
if (capabilities.value.length === 0) void localesStore.fetchLanguages();
if (tenants.value.length === 0) void localesStore.fetchTenants();

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

const handleAdd = (fields: { tenant: string; key: string; value: string }) =>
    localesStore
        .addEntry(tag.value, fields)
        .then(() => {
            entryFormOpen.value = false;
            addMessage(t('locale-entries-page.success-add'));
            return Promise.all([search(true), applyLiveOverrides()]);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Columns of the entries table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<LocaleEntry>[]>(() => [
    { title: t('locale-entries-page.column-tenant'), key: 'tenant' },
    { title: t('locale-entries-page.column-key'), key: 'key' },
    { title: t('locale-entries-page.column-value'), key: 'value', width: '40%' },
    { title: t('locale-entries-page.column-updated-at'), key: 'updatedAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('locale-entries-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Rows of the current page.
 *
 * @returns The page's entries, with the placeholder holes of the sparse pagination list filtered
 *  out.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the toolkit's page window is a SPARSE array; holes are undefined at runtime whatever the element type claims
const pageItems = computed(() => pageItemList.value.filter((item): item is LocaleEntry => !!item));

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
            // Feedback on the row, not a toast: ten edits in a row would be ten toasts.
            savedRows.value[entry.id] = true;
            setTimeout(() => {
                savedRows.value = omit(savedRows.value, entry.id);
            }, 1500);
            return applyLiveOverrides();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

const handleDelete = (entry: LocaleEntry) => {
    return useDialogStore()
        .confirm({
            message: t('locale-entries-page.confirm-delete-entry', { key: entry.key }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            return localesStore
                .removeEntry(tag.value, entry.id)
                .then(() => {
                    addMessage(t('locale-entries-page.success-delete'));
                    return Promise.all([search(true), applyLiveOverrides()]);
                })
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
};

const handleImport = (payload: {
    mode: 'merge' | 'replace';
    tenant: string;
    entries: LocaleEntryInput[];
}) =>
    localesStore
        .importEntries(tag.value, payload.mode, payload.tenant, payload.entries)
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
 * Downloads the whole language as nested JSON — every tenant, paged to completion.
 *
 * Reads the entries collection rather than the messages route, which is `app`-only and invisible
 * for an inactive language; an export carries what is STORED.
 */
const handleExport = () =>
    localesStore
        .fetchAllEntries(tag.value)
        .then((allEntries) => {
            const dictionary = expandEntries(allEntries ?? []);
            downloadBlob(
                new Blob([JSON.stringify(dictionary, undefined, 4)], {
                    type: 'application/json'
                }),
                `${tag.value}.json`
            );
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
                <span class="text-sm opacity-70" role="status">
                    {{ t('locale-entries-page.meta-entries', { count: capability.entryCount }) }} ·
                    {{ t('locale-entries-page.meta-revision', { revision: capability.revision }) }}
                </span>
            </div>
            <v-spacer />
            <v-btn
                variant="text"
                data-test="dictionary-link-header"
                :to="routerLinkI18n({ name: 'LocalesDictionary' })"
            >
                <BookOpenText :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locale-entries-page.button-dictionary') }}
            </v-btn>
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
                        v-model="tenantChoice"
                        :items="tenantFilterOptions"
                        :label="t('locale-entries-page.filter-tenant')"
                        hide-details
                        class="max-w-64"
                        data-test="entries-filter-tenant"
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
            :text="t('locale-entries-page.empty-hint')"
            data-test="entries-empty"
        >
            <template #actions>
                <!--
                    Only the EDITED rows live here. Every key the app and the API actually use,
                    edited or not, is the dictionary board's job — and the answer to "where are
                    the other keys?".
                -->
                <v-btn
                    variant="tonal"
                    data-test="dictionary-link"
                    :to="routerLinkI18n({ name: 'LocalesDictionary' })"
                >
                    <BookOpenText :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('locale-entries-page.button-dictionary') }}
                </v-btn>
            </template>
        </v-empty-state>

        <DataTable
            v-else
            :headers="tableHeaders"
            :items="pageItems"
            :caption="t('locale-entries-page.table-caption', { tag })"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.tenant`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.tenant === localesStore.backendTenant ? 'tertiary' : 'secondary'"
                >
                    {{ localesStore.tenantLabel(item.tenant) }}
                </v-chip>
            </template>

            <template v-slot:[`item.key`]="{ item }">
                <!--
                    Same native-title rule as the board's tenant chips; the visually-hidden
                    sibling repeats it for the reader, because a title alone is mouse-only. Not
                    an `aria-label`: a bare span has no role, and axe (`aria-prohibited-attr`)
                    rightly refuses to let one carry a name.
                -->
                <span class="font-mono text-sm" :title="t('locale-entries-page.key-immutable')">
                    {{ item.key }}
                </span>
                <span class="sr-only">{{ t('locale-entries-page.key-immutable') }}</span>
            </template>

            <template v-slot:[`item.value`]="{ item }">
                <v-text-field
                    :model-value="drafts[item.id] ?? item.value"
                    :aria-label="t('locale-entries-page.value-field-label', { key: item.key })"
                    density="compact"
                    hide-details
                    data-test="entry-value-field"
                    @update:model-value="(draft) => (drafts[item.id] = draft)"
                    @blur="handleValueBlur(item)"
                    @keydown.enter.prevent="handleValueBlur(item)"
                >
                    <template v-if="savedRows[item.id]" #append-inner>
                        <Check
                            :size="16"
                            class="text-success"
                            data-test="entry-saved"
                            role="img"
                            :aria-label="t('locale-entries-page.success-edit')"
                        />
                    </template>
                </v-text-field>
            </template>

            <template v-slot:[`item.updatedAt`]="{ item }">
                <span class="text-sm">{{ formatDateTime(item.updatedAt) }}</span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                    size="small"
                    variant="tonal"
                    color="error"
                    data-test="entry-delete"
                    :aria-label="t('locale-entries-page.button-delete-named', { key: item.key })"
                    :disabled="loading"
                    @click="handleDelete(item)"
                >
                    {{ t('locale-entries-page.button-delete') }}
                </v-btn>
            </template>
        </DataTable>

        <ListPagination
            v-model="pageCurrent"
            :length="entriesPageTotal"
            :aria-label="t('locale-entries-page.pagination-label')"
        />

        <EntryFormDialog
            v-model="entryFormOpen"
            :tenants="tenants"
            :initial-tenant="filters.tenant"
            @save="handleAdd"
        />
        <EntriesImportDialog
            v-model="importOpen"
            :tenants="tenants"
            :initial-tenant="filters.tenant"
            @import="handleImport"
        />
    </LayoutDefault>
</template>
