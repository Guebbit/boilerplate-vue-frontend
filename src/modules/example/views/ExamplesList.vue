<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ExamplesListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * In any module: a list screen wires the store's paginated search to a filter form and a `DataTable`;
 * the filters live in the URL so a view can be linked.
 * Here: Edit and Delete follow each row's `actions`; only Create, which has no row, asks `session.can`.
 * The server sorts: a header click writes `sort` into the URL state and re-searches from page 1.
 * See: docs/tools/state-and-routing.md
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useExampleStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import type { ThemeColor } from '@/ui/types.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { formatDate } from '@/infrastructure/utils/formatters.ts';
import { ExampleSortItem, ExampleStatus } from '@/types/enums.ts';
import { publicationOf } from '../domain';
import type { Example } from '@types';

import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import { sortFieldsOf } from '@/infrastructure/utils/sort.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import ListSearchActions from '@/ui/molecules/ListSearchActions.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useRowActions } from '@/ui/composables/use-row-actions.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The session, for the one rule with no row to ask: whether the caller may create at all.
 */
const session = useSessionStore();

/**
 * Store actions.
 */
const { watchExamplesSearch, deleteExample } = useExampleStore();

/**
 * Store state: the filters, the current page window and the pagination counters.
 */
const { filters, pageItemList, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useExampleStore());

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Options of the status filter. The "any" row's value is `null`, not `undefined`: Vuetify reads an
 * `undefined` item value as "use the title", which would post the translated label.
 *
 * @returns The localized options, re-translated on locale change.
 */
const statusOptions = computed(() => [
    { value: null, label: t('examples-list-page.filter-status-all') },
    ...Object.values(ExampleStatus).map((value) => ({ value, label: t(`example-status.${value}`) }))
]);

/**
 * The status select's model: `null` (the "any" row) on screen, no `status` filter in the store.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.status,
    (value) => {
        filters.value.status = value;
    }
);

/**
 * Colour of a status chip, one per status.
 */
const statusColor: Readonly<Record<ExampleStatus, ThemeColor>> = {
    draft: 'warning',
    published: 'success',
    archived: 'secondary'
};

/**
 * Columns of the table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<Example>[]>(() => [
    { title: t('examples-list-page.column-title'), key: 'title' },
    { title: t('examples-list-page.column-status'), key: 'status' },
    { title: t('examples-list-page.column-owner'), key: 'ownerName' },
    { title: t('examples-list-page.column-publication'), key: 'publishedAt' },
    { title: t('examples-list-page.column-created-at'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('examples-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * What one row's publication reads as, in words.
 *
 * @param example - The row.
 * @returns "Live, first published …", "Withdrawn, first published …" or "Never published".
 */
const publicationText = (example: Example) => {
    const { state, firstPublishedAt } = publicationOf(example);
    return t(`example-publication.${state}`, { date: formatDate(firstPublishedAt) });
};

/**
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize,
    params: { text: 'string', status: Object.values(ExampleStatus), sort: 'string' }
});

/**
 * Search bound to the store's reactive filters and pagination, reporting a failed request as a
 * toast: a list that did not refresh is ambient, not a blocked workflow.
 */
const { search } = watchExamplesSearch({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Apply and clear, both restarting from the first page and keeping the URL in step.
 */
const { handleSearch, handleReset } = useListSearch({
    filters,
    page: pageCurrent,
    search,
    onApplied: syncUrl
});

/**
 * The columns the API can order by (the contract's `ExampleSort` enum); the other headers stay
 * inert rather than reorder one page.
 */
const sortableKeys = sortFieldsOf(ExampleSortItem);

/**
 * The header's sort state, kept in `filters.sort` so it travels in the URL and the request.
 */
const { sortBy } = useServerSort({ filters, apply: handleSearch });

/**
 * The row action's own blocked state: delete is the table's only write, behind a confirm dialog
 * that has closed by the time the request answers, so one alert lives above the table.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * The confirm → delete → toast pipeline, failing into {@link rowActionError}.
 */
const { runConfirmed } = useRowActions({
    report: reportRowActionError,
    clear: clearRowActionError
});

/**
 * Deletes an example after an explicit confirmation.
 *
 * @param example - The example to delete.
 * @returns A promise settling once the visitor answered and, if they accepted, the delete finished;
 *  a failure blocks the list in place.
 */
const handleDelete = (example: Example) =>
    runConfirmed({
        confirm: t('examples-list-page.confirm-delete', { title: example.title }),
        action: () => deleteExample(example.id),
        success: t('examples-list-page.success-delete')
    });
</script>

<template>
    <div id="examples-list-page">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    <v-text-field
                        v-model="filters.text"
                        data-test="filter-text"
                        :label="t('examples-list-page.filter-text')"
                        hide-details
                    />
                    <v-select
                        v-model="statusChoice"
                        data-test="filter-status"
                        :label="t('examples-list-page.filter-status')"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                    <PageSizeSelect v-model="pageSize" />
                </div>
                <ListSearchActions @reset="handleReset">
                    <v-spacer />
                    <v-btn
                        v-if="session.can('create', 'Example')"
                        color="secondary"
                        data-test="example-create"
                        :to="routerLinkI18n({ name: 'ExampleCreate' })"
                    >
                        <Plus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('examples-list-page.button-create') }}
                    </v-btn>
                </ListSearchActions>
            </form>
        </v-card>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="examples-list-row-action-error"
        />

        <DataTable
            v-model:sort-by="sortBy"
            :server-sort-keys="sortableKeys"
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('examples-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.status`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="statusColor[item.status]"
                    data-test="example-status"
                    :data-status="item.status"
                >
                    {{ t(`example-status.${item.status}`) }}
                </v-chip>
            </template>

            <template v-slot:[`item.publishedAt`]="{ item }">
                <span data-test="example-publication">{{ publicationText(item) }}</span>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="
                            t('examples-list-page.button-view-named', { title: item.title })
                        "
                        :to="routerLinkI18n({ name: 'ExampleTarget', params: { id: item.id } })"
                    >
                        {{ t('examples-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="item.actions?.update"
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="
                            t('examples-list-page.button-edit-named', { title: item.title })
                        "
                        :to="routerLinkI18n({ name: 'ExampleEdit', params: { id: item.id } })"
                    >
                        {{ t('examples-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="item.actions?.delete"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="
                            t('examples-list-page.button-delete-named', { title: item.title })
                        "
                        :disabled="loading"
                        @click.stop="handleDelete(item)"
                    >
                        {{ t('examples-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </div>
</template>
