<script lang="ts">
export default {
    name: 'LocalesDictionaryPage'
};
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowLeft, Check, Plus, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useDictionaryAggregation } from '@/modules/locales/composables/use-dictionary-aggregation.ts';
import { useDictionaryCellEditor } from '@/modules/locales/composables/use-dictionary-cell-editor.ts';
import type { LocaleCapability } from '@types';

/**
 * The dictionary board: every key down the side, every language across the top, one cell each.
 *
 * EVERY key — not only the edited ones. The rows are the union of what the dictionaries actually
 * contain: for THIS frontend's tenant, the keys it bundles (shared file plus every module's
 * slice); for the backend tenant, the keys the API's deployed files declare; for any other tenant
 * — another client this API serves — nothing but what is stored, because its files live in a
 * repository this build cannot see; plus, in every tenant, whatever has been stored as an entry.
 * The entries page lists edits; this page lists the language.
 *
 * A cell is one of three things, and looks like it:
 *   - an ENTRY — a stored override, shown as the field's value;
 *   - a BASELINE — the bundled or deployed text nobody has overridden, shown as a marked
 *     placeholder, so a translator sees what they would be replacing;
 *   - MISSING — neither, which is the gap the header counts and the toggle isolates.
 *
 * Writing a cell creates, edits or removes the entry; nothing here ever writes a baseline — the
 * files are a deploy, not a form. A language this build does not bundle has no baseline at all
 * in this frontend's tenant, so every key is missing there until translated — which is exactly
 * the work queue a new language is.
 *
 * Paged client-side. A whole language is a few hundred rows at most and the export already pages
 * it to completion, so this reuses that read per language rather than inventing a matrix endpoint
 * the contract does not have.
 *
 * Three concerns share one board and interlock through it: filtering/pagination (below), per-cell
 * writes (`useDictionaryCellEditor`), and the three-source aggregation both of those read through
 * (`useDictionaryAggregation`) — entries, the API's baseline, this build's bundled baseline, and
 * keys added but not yet saved. Splitting further than that would cut along a shared computed
 * property rather than a real seam.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const localesStore = useLocalesStore();

/** Rows per page of the board. */
const PAGE_SIZE = 25;

/** Whose dictionary the board shows; a key lives in exactly one tenant. This build's own by default. */
const tenant = ref(localesStore.ownTenant);

const {
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
} = useDictionaryAggregation(tenant);

const {
    drafts,
    savedCells,
    cellErrors,
    boardElement,
    cellId,
    handleCellBlur,
    handleCellClear,
    handleCellEnter,
    handleCellInput,
    cellLabel
} = useDictionaryCellEditor(tenant, entryAt, baselineAt, afterWrite);

/** Client-side text filter over keys and values. */
const filterText = ref('');

/** The filter as last submitted, so typing does not reshuffle the board under the cursor. */
const appliedFilter = ref('');

/** Show only the keys at least one language is missing. */
const incompleteOnly = ref(false);

const pageCurrent = ref(1);

const newKey = ref('');

const languageFormOpen = ref(false);

/** The keys matching the filters: text across key and values, and the incomplete-only toggle. */
const filteredKeys = computed(() => {
    const needle = appliedFilter.value.trim().toLowerCase();
    return allKeys.value.filter((key) => {
        if (
            incompleteOnly.value &&
            !languages.value.some((language) => isMissing(language.tag, key))
        )
            return false;
        if (needle === '') return true;
        return (
            key.toLowerCase().includes(needle) ||
            languages.value.some((language) =>
                (entryAt(language.tag, key)?.value ?? baselineAt(language.tag, key))
                    ?.toLowerCase()
                    .includes(needle)
            )
        );
    });
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
    addPendingKey(key);
    newKey.value = '';
    appliedFilter.value = '';
    filterText.value = '';
    incompleteOnly.value = false;
    // Land on the page the new row sorted into, so the translator sees where to type.
    pageCurrent.value = Math.floor(allKeys.value.indexOf(key) / PAGE_SIZE) + 1;
    // And put the cursor there: the page moved under them, and the row is the reason it did.
    return nextTick().then(() => {
        boardElement.value
            ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"] input`)
            ?.focus();
    });
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

// A tenant switch is a different board: different keys, different page count, stale drafts.
watch(tenant, () => {
    pageCurrent.value = 1;
    drafts.value = {};
    resetPendingKeys();
});

// The toggle narrows the list; a page that no longer exists would render empty.
watch(incompleteOnly, () => {
    pageCurrent.value = 1;
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
            <span class="text-sm opacity-70" role="status" data-test="dictionary-key-count">
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
                        v-model="tenant"
                        :items="tenantOptions"
                        :label="t('locales-dictionary-page.filter-tenant')"
                        hide-details
                        class="max-w-64"
                        data-test="dictionary-filter-tenant"
                    />
                    <v-switch
                        v-model="incompleteOnly"
                        :label="t('locales-dictionary-page.filter-incomplete')"
                        color="primary"
                        hide-details
                        inset
                        data-test="dictionary-filter-incomplete"
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

        <!--
            A tenant whose files live elsewhere shows stored rows only; say so, or an empty column
            reads as "nothing translated" when it means "nothing this build can see".
        -->
        <v-alert
            v-if="!hasBaseline"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
            data-test="dictionary-no-baseline"
            :text="
                t('locales-dictionary-page.no-baseline', {
                    tenant: localesStore.tenantLabel(tenant)
                })
            "
        />

        <v-empty-state
            v-if="!loading && languages.length === 0"
            :title="t('locales-dictionary-page.no-languages')"
            data-test="dictionary-no-languages"
        />

        <v-empty-state
            v-else-if="!loading && filteredKeys.length === 0"
            :title="
                incompleteOnly || appliedFilter
                    ? t('locales-dictionary-page.empty-filtered')
                    : t('locales-dictionary-page.empty')
            "
            data-test="dictionary-empty"
        />

        <div v-else ref="boardElement" class="dictionary-board overflow-x-auto">
            <DataTable
                :headers="tableHeaders"
                :items="pageRows"
                :caption="t('locales-dictionary-page.table-caption')"
                :loading="loading"
                :loading-text="t('generic.loading')"
                :no-data-text="t('generic.no-data')"
                item-value="key"
            >
                <template
                    v-for="language in languages"
                    :key="`header-${language.tag}`"
                    v-slot:[`header.${language.tag}`]="{ column }"
                >
                    <div class="flex flex-col">
                        <span>{{ column.title }}</span>
                        <!--
                            The board's one number per language. Zero reads as "complete", which
                            is the goal, rather than as a count of nothing.
                        -->
                        <span
                            class="text-xs font-normal"
                            :class="missingByTag[language.tag] ? 'text-error' : 'text-success'"
                            role="status"
                            data-test="dictionary-missing-count"
                        >
                            {{
                                missingByTag[language.tag]
                                    ? t('locales-dictionary-page.missing-count', {
                                          missing: missingByTag[language.tag],
                                          total: allKeys.length
                                      })
                                    : t('locales-dictionary-page.complete')
                            }}
                        </span>
                    </div>
                </template>

                <template v-slot:[`item.key`]="{ item }">
                    <!--
                        Same native-title rule as the entries page's keys; the visually-hidden
                        sibling repeats it for the reader, because a title alone is mouse-only.
                        Not an `aria-label` — a role-less span may not carry a name
                        (`aria-prohibited-attr`).
                    -->
                    <span class="font-mono text-sm" :title="t('locale-entries-page.key-immutable')">
                        {{ item.key }}
                    </span>
                    <span class="sr-only">{{ t('locale-entries-page.key-immutable') }}</span>
                </template>

                <template
                    v-for="language in languages"
                    :key="language.tag"
                    v-slot:[`item.${language.tag}`]="{ item }"
                >
                    <!--
                        Three looks for three states — see the component note. The baseline
                        class tints the field and the title says which baseline; the missing
                        class is the only one with an outline, so a gap is visible from across
                        the room.
                    -->
                    <v-text-field
                        :model-value="
                            drafts[cellId(language.tag, item.key)] ??
                            entryAt(language.tag, item.key)?.value ??
                            ''
                        "
                        :placeholder="baselineAt(language.tag, item.key)"
                        persistent-placeholder
                        :aria-label="cellLabel(language, item.key)"
                        :title="
                            cellState(language.tag, item.key) === 'entry'
                                ? undefined
                                : cellState(language.tag, item.key) === 'missing'
                                  ? t('locales-dictionary-page.cell-missing')
                                  : t(`locales-dictionary-page.cell-baseline-${tenantKind}`)
                        "
                        :dir="language.direction"
                        :error-messages="cellErrors[cellId(language.tag, item.key)]"
                        :clearable="cellState(language.tag, item.key) === 'entry'"
                        density="compact"
                        hide-details="auto"
                        class="min-w-48"
                        :class="`cell-${cellState(language.tag, item.key)}`"
                        data-test="dictionary-cell"
                        :data-state="cellState(language.tag, item.key)"
                        :data-key="item.key"
                        @update:model-value="(draft) => handleCellInput(language, item.key, draft)"
                        @blur="handleCellBlur(language, item.key)"
                        @keydown.enter.prevent="handleCellEnter(language, item.key, $event)"
                        @click:clear="handleCellClear(language, item.key, $event)"
                    >
                        <template v-if="savedCells[cellId(language.tag, item.key)]" #append-inner>
                            <Check
                                :size="16"
                                class="text-success"
                                data-test="dictionary-cell-saved"
                                role="img"
                                :aria-label="
                                    t('locales-dictionary-page.success-save-named', {
                                        key: item.key,
                                        language: language.nativeName
                                    })
                                "
                            />
                        </template>
                    </v-text-field>
                </template>
            </DataTable>
        </div>

        <ListPagination
            v-model="pageCurrent"
            :length="pageTotal"
            :aria-label="t('locales-dictionary-page.pagination-label')"
        />

        <LanguageFormDialog v-model="languageFormOpen" @save="handleCreateLanguage" />
    </LayoutDefault>
</template>

<style scoped>
/*
 * The key column stays put while the languages scroll: five columns of text fields overflow any
 * viewport, and a row is meaningless without its key. The background is required — a sticky
 * cell with none lets the scrolled cells show through it.
 */
.dictionary-board :deep(td:first-child),
.dictionary-board :deep(th:first-child) {
    position: sticky;
    left: 0;
    z-index: 1;
    background: rgb(var(--v-theme-surface));
}

/* A baseline cell: the text is real, just not yet overridden here. */
.dictionary-board :deep(.cell-baseline .v-field) {
    background: rgba(var(--v-theme-secondary), 0.06);
}

.dictionary-board :deep(.cell-baseline input::placeholder) {
    opacity: 0.85;
    font-style: italic;
}

/* A missing cell: nothing renders for this key in this language. */
.dictionary-board :deep(.cell-missing .v-field) {
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-error), 0.5);
}
</style>
