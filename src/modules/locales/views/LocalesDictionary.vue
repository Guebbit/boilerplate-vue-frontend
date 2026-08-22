<script lang="ts">
export default {
    name: 'LocalesDictionaryPage'
};
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { ArrowLeft, Check, Plus, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { updateLocale as applyDictionary } from '@/infrastructure/i18n';
import { fetchLocaleOverrides } from '@/infrastructure/i18n/locale-overrides.ts';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { LocaleTenantKind } from '@types';
import type { LocaleCapability, LocaleEntry } from '@types';

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
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const dialogStore = useDialogStore();
const localesStore = useLocalesStore();
const { capabilities, tenants, loading } = storeToRefs(localesStore);

/** Rows per page of the board. */
const PAGE_SIZE = 25;

/** How long the "saved" mark stays on a cell, in milliseconds. */
const SAVED_MARK_MS = 1500;

/** Whose dictionary the board shows; a key lives in exactly one tenant. This build's own by default. */
const tenant = ref(localesStore.ownTenant);

/** What kind of tenant is on the board — decides which baseline, if any, the cells show. */
const tenantKind = computed(
    () => tenants.value.find(({ id }) => id === tenant.value)?.kind ?? LocaleTenantKind.frontend
);

/** Whether the shown tenant has a baseline this build can read: its own bundle, or the API's files. */
const hasBaseline = computed(
    () => tenant.value === localesStore.ownTenant || tenantKind.value === LocaleTenantKind.backend
);

/** Client-side text filter over keys and values. */
const filterText = ref('');

/** The filter as last submitted, so typing does not reshuffle the board under the cursor. */
const appliedFilter = ref('');

/** Show only the keys at least one language is missing. */
const incompleteOnly = ref(false);

const pageCurrent = ref(1);

/** Every entry of every language, every tenant, by language tag. */
const entriesByTag = ref<Partial<Record<string, LocaleEntry[]>>>({});

/** The API's deployed dictionary by language tag — the backend tenant's baseline. */
const apiBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

/** This build's bundled dictionary by language tag — its own tenant's baseline. */
const appBaselines = ref<Partial<Record<string, Partial<Record<string, string>>>>>({});

/** Keys added on this page that have no entry in any language yet. */
const pendingKeys = ref<string[]>([]);

const newKey = ref('');

const languageFormOpen = ref(false);

/** Local draft per cell, so a blur can tell "changed" from "clicked through". */
const drafts = ref<Partial<Record<string, string>>>({});

/** Cells whose last save just landed; the check mark inside the field, cleared after a beat. */
const savedCells = ref<Partial<Record<string, true>>>({});

/** Cells whose last write failed; the message stays under the field until the cell is edited. */
const cellErrors = ref<Partial<Record<string, string>>>({});

/** The board's element, so a new row's cell can be found and focused without a global query. */
const boardElement = ref<HTMLElement>();

/** Drops one cell's draft, so the cell reads the stored value again. */
const forgetDraft = (id: string) => {
    drafts.value = Object.fromEntries(Object.entries(drafts.value).filter(([k]) => k !== id));
};

/** Drops one cell's error, so a fresh attempt starts clean. */
const forgetError = (id: string) => {
    cellErrors.value = Object.fromEntries(
        Object.entries(cellErrors.value).filter(([k]) => k !== id)
    );
};

/** Shows the saved mark on one cell, then takes it away. */
const markSaved = (id: string) => {
    savedCells.value = { ...savedCells.value, [id]: true };
    setTimeout(() => {
        savedCells.value = Object.fromEntries(
            Object.entries(savedCells.value).filter(([k]) => k !== id)
        );
    }, SAVED_MARK_MS);
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

const tenantOptions = computed(() =>
    tenants.value.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
);

/** The cell's draft key: tag and key joined by a separator no BCP 47 tag can contain. */
const cellId = (tag: string, key: string) => `${tag}|${key}`;

/** One language's entries of the shown tenant, by key. */
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

/** The shown tenant's baselines, by language tag — none for a tenant this build cannot read. */
const baselines = computed<Partial<Record<string, Partial<Record<string, string>>>>>(() => {
    if (tenant.value === localesStore.ownTenant) return appBaselines.value;
    if (tenantKind.value === LocaleTenantKind.backend) return apiBaselines.value;
    return {};
});

const entryAt = (tag: string, key: string): LocaleEntry | undefined =>
    entriesIndex.value[tag]?.get(key);

const baselineAt = (tag: string, key: string): string | undefined => baselines.value[tag]?.[key];

/** A cell with neither an entry nor a baseline: the gap the board exists to show. */
const isMissing = (tag: string, key: string) =>
    entryAt(tag, key) === undefined && baselineAt(tag, key) === undefined;

/** The cell's state, for its look and its title. */
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

/** Per language: how many of the board's keys it is missing. */
const missingByTag = computed<Partial<Record<string, number>>>(() =>
    Object.fromEntries(
        languages.value.map((language) => [
            language.tag,
            allKeys.value.filter((key) => isMissing(language.tag, key)).length
        ])
    )
);

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

/** Reloads one language's column: its rows and both baselines. */
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

/** Loads the registry and the manifest, then every writable language's column. */
const loadBoard = () =>
    Promise.all([localesStore.fetchTenants(), localesStore.fetchLanguages()])
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

/** The `<input>` a cell event came from, whether the key landed on it or its clear button. */
const inputOf = (event: Event): HTMLElement | null =>
    (event.target as HTMLElement | null)?.closest('.v-field')?.querySelector('input') ?? null;

/** What every cell write ends with: the draft gone, the column reloaded, a failure on the cell. */
const settleWrite = (language: LocaleCapability, id: string, request: Promise<unknown>) =>
    request
        .then(() => {
            forgetDraft(id);
            return afterWrite(language.tag);
        })
        .catch((error: unknown) => {
            // On the cell as well as the toast: the toast is gone in seconds, the cell is not.
            cellErrors.value = {
                ...cellErrors.value,
                [id]: t('locales-dictionary-page.error-save')
            };
            notifyErrorMessages(addMessage, error);
        });

/**
 * Saves one cell on blur — if it actually changed.
 *
 * Two of the three outcomes live here, decided by what the cell held and what it holds now: a new
 * value over an empty cell CREATES the entry, a different value EDITS it. The third — an emptied
 * cell REMOVING its entry — is {@link handleCellClear}, and it is deliberately NOT reached from a
 * blur: a confirmation that opens because focus moved on is a dialog nobody asked for, and it
 * steals the focus it then has to give back. An emptied cell left by blur just reads its stored
 * value again.
 *
 * @param language - The column.
 * @param key - The row.
 * @returns Nothing; success is shown on the cell, failure on the cell and as a toast.
 */
const handleCellBlur = (language: LocaleCapability, key: string) => {
    const id = cellId(language.tag, key);
    const draft = drafts.value[id];
    const current = entryAt(language.tag, key);
    if (draft === undefined || draft === (current?.value ?? '')) return;
    if (draft === '') {
        forgetDraft(id);
        return;
    }
    const request = current
        ? localesStore.editEntry(language.tag, current.id, draft)
        : localesStore.addEntry(language.tag, { tenant: tenant.value, key, value: draft });
    return settleWrite(
        language,
        id,
        request.then(() => markSaved(id))
    );
};

/**
 * Removes one cell's entry, on an explicit action: Enter on an emptied cell, or the clear button.
 *
 * Confirmed first, because an accidental select-all-and-delete must cost a click, not a
 * translation. A cancel puts the stored value and the focus back where they were. Removing an
 * entry uncovers the baseline again; it never deletes the bundled text.
 *
 * @param language - The column.
 * @param key - The row.
 * @param event - The keystroke or click, so a cancel can focus the cell it came from.
 * @returns Nothing; the outcome is reported as a toast naming the cell.
 */
const handleCellClear = (language: LocaleCapability, key: string, event: Event) => {
    const id = cellId(language.tag, key);
    const current = entryAt(language.tag, key);
    if (!current) {
        forgetDraft(id);
        return;
    }
    const origin = inputOf(event);
    return dialogStore
        .confirm({
            message: t('locales-dictionary-page.confirm-clear', {
                key,
                language: language.nativeName
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) {
                forgetDraft(id);
                origin?.focus();
                return;
            }
            return settleWrite(
                language,
                id,
                localesStore.removeEntry(language.tag, current.id).then(() =>
                    addMessage(
                        t('locales-dictionary-page.success-remove-named', {
                            key,
                            language: language.nativeName
                        })
                    )
                )
            );
        });
};

/**
 * Enter on a cell: a removal when the cell was emptied, a save otherwise — the same save a blur
 * would do, one keystroke sooner.
 */
const handleCellEnter = (language: LocaleCapability, key: string, event: Event) => {
    const draft = drafts.value[cellId(language.tag, key)];
    return draft === '' ? handleCellClear(language, key, event) : handleCellBlur(language, key);
};

/** Records a keystroke in the cell's draft; a cell being typed into is no longer in error. */
const handleCellInput = (language: LocaleCapability, key: string, draft: string) => {
    const id = cellId(language.tag, key);
    drafts.value[id] = draft;
    if (cellErrors.value[id]) forgetError(id);
};

/** The cell's accessible name: the key, the language, and the baseline it would be replacing. */
const cellLabel = (language: LocaleCapability, key: string) => {
    const baseline = baselineAt(language.tag, key);
    return baseline === undefined || entryAt(language.tag, key)
        ? t('locales-dictionary-page.cell-label', { key, language: language.nativeName })
        : t('locales-dictionary-page.cell-label-baseline', {
              key,
              language: language.nativeName,
              baseline
          });
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
    pendingKeys.value = [];
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
