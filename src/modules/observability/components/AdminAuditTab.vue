<script setup lang="ts">
/**
 * @module
 * Audit-log tab: filter form, table and pager over one audit trail. Self-fetching — `endpoint`
 * picks which of the two contract-backed reads {@link useAuditTrail} drives, so this one component covers the platform dashboard's audit tab,
 * a record's own history and the shop-wide audit page without duplicating the fetch/pagination
 * wiring three times.
 */
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import CopyButton from '@/ui/molecules/CopyButton.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import ListSearchActions from '@/ui/molecules/ListSearchActions.vue';
import AuditMetadataDetail from './AuditMetadataDetail.vue';
import { auditTargetLocation, shortTargetId } from '../composables/audit-target.ts';
import { useAuditTrail, type AuditEndpoint } from '../composables/use-audit-trail.ts';
import type { AuditEntryItem } from '@types';
import type { AdminAuditFilters } from '../types.ts';
import { EMPTY_VALUE, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';

/**
 * i18n translator for this component's template and messages.
 */
const { t } = useI18n();

/**
 * Which trail to read, and where the target filter starts.
 */
const props = defineProps<{
    endpoint: AuditEndpoint;
    /** The target filter's starting value (e.g. one record's id, from a "History" link). The
     * visitor can edit or clear it; it is not a fixed scope. Shop trail only. */
    target?: string;
}>();

/**
 * The router, for linking a row's target to its page.
 */
const router = useRouter();

/**
 * Whether the filters the platform trail's contract does not declare (`target`, `ownOrder`) show.
 */
const isShop = computed(() => props.endpoint === 'shop');

/**
 * Rows, pagination totals and load/error state for {@link props.endpoint} — fetched by this
 * component itself rather than handed down, which is what lets every caller reuse it as-is.
 */
const { entries, total, pages, loading, error, fetchPage } = useAuditTrail(props.endpoint);

/**
 * What the table asks for when nobody has chosen.
 */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Live audit filter form state, sent as-is to {@link fetchPage}.
 */
const filters = reactive<AdminAuditFilters>({
    actor: undefined,
    action: undefined,
    outcome: undefined,
    since: undefined,
    target: props.endpoint === 'shop' ? props.target : undefined,
    ownOrder: undefined,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE
});

/**
 * Options of the outcome select. The "all" row's value is `null`, not `undefined` —
 * Vuetify reads an `undefined` item value as "use the title", which would post the translated
 * label instead of no filter at all.
 *
 * @returns The localized `all`/`success`/`failure` choices.
 */
const outcomeOptions = computed(() => [
    { value: null, label: t('admin-page.audit-filter-outcome-all') },
    { value: 'success', label: t('admin-page.audit-filter-outcome-success') },
    { value: 'failure', label: t('admin-page.audit-filter-outcome-failure') }
]);

/**
 * The outcome select's model: `null` (the "all" row) on screen, no `outcome` filter in
 * {@link filters}.
 */
const outcomeChoice = useAnyFilterChoice(
    () => filters.outcome,
    (value) => {
        filters.outcome = value;
    }
);

/**
 * Selectable page sizes, bounded by the `maximum: 100` the contract declares — an option the API
 * answers with a 422 is not an option.
 */
const pageSizeOptions = [20, 50, 100];

/**
 * Columns of the audit table.
 *
 * @returns The localized headers, keyed on the audit event fields.
 */
const tableHeaders = computed<CoreDataTableHeader<AuditEntryItem>[]>(() => [
    { title: t('admin-page.audit-col-timestamp'), key: 'timestamp' },
    { title: t('admin-page.audit-col-actor'), key: 'actorUserId' },
    { title: t('admin-page.audit-col-role'), key: 'actorRole' },
    { title: t('admin-page.audit-col-action'), key: 'action' },
    { title: t('admin-page.audit-col-target'), key: 'targetId' },
    { title: t('admin-page.audit-col-outcome'), key: 'outcome' },
    { title: t('admin-page.audit-col-ip'), key: 'ip' },
    { title: t('admin-page.audit-col-request-id'), key: 'requestId' },
    { title: t('admin-page.audit-col-trace-id'), key: 'traceId' }
]);

/**
 * Runs the search with the current filters.
 *
 * @returns The fetch promise, resolving once the page is loaded (or `error` is set).
 */
const handleSearch = () => {
    // Back to the first page: the previous page number belongs to the previous result set.
    filters.page = 1;
    return fetchPage({ ...filters });
};

/**
 * Turning the pager re-runs the search on that page.
 *
 * The page lives in the filter bag rather than in separate state: the trail is append-only and
 * paged from the newest end, so a page number that outlived its filters would point at a
 * different set of rows than the one the visitor was reading.
 *
 * @param page - The 1-based page the pager moved to.
 * @returns The fetch promise, resolving once the page is loaded.
 */
const handlePageChange = (page: number) => {
    filters.page = page;
    return fetchPage({ ...filters });
};

/**
 * Clears every filter (keeping the default page size) and re-runs the search.
 *
 * @returns The fetch promise, resolving once the page is loaded.
 */
const handleReset = () => {
    filters.actor = undefined;
    filters.action = undefined;
    filters.outcome = undefined;
    filters.since = undefined;
    filters.target = undefined;
    filters.ownOrder = undefined;
    filters.page = 1;
    filters.pageSize = DEFAULT_PAGE_SIZE;
    return fetchPage({ ...filters });
};

/**
 * Where a row's target link goes, localized.
 *
 * @param item - The audit row.
 * @returns The record's page, or `undefined` when the target has none (it is then plain text).
 */
const targetLink = (item: AuditEntryItem) => {
    const location = auditTargetLocation(router, item.targetType, item.targetId);
    return location ? routerLinkI18n(location) : undefined;
};

/**
 * Shortens a correlation id so it fits in a table cell.
 *
 * @param value - Request/trace id, possibly missing.
 * @param length - Number of leading characters to keep. Defaults to `8`.
 * @returns The truncated id followed by an ellipsis, or a dash when absent.
 */
const truncateId = (value?: string, length = 8) =>
    value ? `${value.slice(0, length)}...` : EMPTY_VALUE;

// The initial load: the first page, unfiltered.
void fetchPage({ ...filters });
</script>

<template>
    <div class="grid grid-cols-1 gap-4">
        <v-card class="p-5" variant="flat" border>
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    <v-text-field
                        v-model="filters.actor"
                        type="text"
                        data-test="filter-actor"
                        :label="t('admin-page.audit-filter-actor')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.action"
                        type="text"
                        data-test="filter-action"
                        :label="t('admin-page.audit-filter-action')"
                        hide-details
                    />
                    <v-select
                        v-model="outcomeChoice"
                        data-test="filter-outcome"
                        :items="outcomeOptions"
                        item-title="label"
                        item-value="value"
                        :label="t('admin-page.audit-filter-outcome-all')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.since"
                        type="datetime-local"
                        data-test="filter-since"
                        :label="t('admin-page.audit-filter-since')"
                        hide-details
                    />
                    <v-text-field
                        v-if="isShop"
                        v-model="filters.target"
                        type="text"
                        data-test="filter-target"
                        :label="t('admin-page.audit-filter-target')"
                        hide-details
                    />
                    <v-checkbox
                        v-if="isShop"
                        v-model="filters.ownOrder"
                        data-test="filter-own-order"
                        :label="t('admin-page.audit-filter-own-order')"
                        hide-details
                    />
                    <PageSizeSelect
                        v-model="filters.pageSize"
                        :sizes="pageSizeOptions"
                        @update:model-value="handleSearch"
                    />
                </div>
                <ListSearchActions :loading="loading" @reset="handleReset" />
            </form>
        </v-card>

        <p class="m-0 text-sm opacity-muted" role="status">
            {{
                t('admin-page.audit-showing', {
                    shown: entries.length,
                    total
                })
            }}
        </p>

        <v-alert v-if="error" type="error" :text="error" />

        <DataTable
            v-else
            :headers="tableHeaders"
            :items="entries"
            :caption="t('admin-page.audit-table-caption')"
            :loading="loading"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.timestamp`]="{ item }">
                <span class="whitespace-nowrap">{{ formatDateTime(item.timestamp) }}</span>
            </template>

            <template v-slot:[`item.action`]="{ item }">
                <span class="inline-flex flex-wrap items-center gap-2">
                    {{ item.action }}
                    <!-- Own money is allowed and recorded: the row says the actor was the buyer. -->
                    <v-chip
                        v-if="item.metadata?.ownOrder === true"
                        size="x-small"
                        variant="tonal"
                        color="info"
                        data-test="audit-own-order"
                    >
                        {{ t('admin-page.audit-own-order') }}
                    </v-chip>
                </span>
                <!-- What the entry recorded beyond the action: an update's changed fields, among others. -->
                <AuditMetadataDetail :metadata="item.metadata" />
            </template>

            <template v-slot:[`item.targetId`]="{ item }">
                <component
                    :is="targetLink(item) ? RouterLink : 'span'"
                    v-if="item.targetId"
                    class="whitespace-nowrap"
                    data-test="audit-target"
                    :to="targetLink(item)"
                >
                    {{ item.targetType }} {{ shortTargetId(item.targetId) }}
                </component>
                <template v-else>{{ EMPTY_VALUE }}</template>
            </template>

            <template v-slot:[`item.actorRole`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.actorRole === 'admin' ? 'tertiary' : 'secondary'"
                >
                    {{ item.actorRole }}
                </v-chip>
            </template>

            <template v-slot:[`item.outcome`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.outcome === 'success' ? 'success' : 'error'"
                >
                    {{ item.outcome }}
                </v-chip>
            </template>

            <template v-slot:[`item.ip`]="{ item }">
                {{ item.ip ?? EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.requestId`]="{ item }">
                <!--
                    The truncated id is for the eye only (hidden from a reader); the copy button
                    carries the full id in its name, for a screen reader and a finger alike.
                -->
                <span class="inline-flex items-center gap-1" v-if="item.requestId">
                    <span class="font-mono text-xs" aria-hidden="true">
                        {{ truncateId(item.requestId) }}
                    </span>
                    <CopyButton
                        :text="item.requestId"
                        :label="t('admin-page.audit-copy-request-id', { id: item.requestId })"
                        failure-key="admin-page.audit-copy-failed"
                        data-test="audit-copy-requestId"
                    />
                </span>
                <template v-else>{{ EMPTY_VALUE }}</template>
            </template>

            <template v-slot:[`item.traceId`]="{ item }">
                <!--
                    The truncated id is for the eye only (hidden from a reader); the copy button
                    carries the full id in its name, for a screen reader and a finger alike.
                -->
                <span class="inline-flex items-center gap-1" v-if="item.traceId">
                    <span class="font-mono text-xs" aria-hidden="true">
                        {{ truncateId(item.traceId) }}
                    </span>
                    <CopyButton
                        :text="item.traceId"
                        :label="t('admin-page.audit-copy-trace-id', { id: item.traceId })"
                        failure-key="admin-page.audit-copy-failed"
                        data-test="audit-copy-traceId"
                    />
                </span>
                <template v-else>{{ EMPTY_VALUE }}</template>
            </template>
        </DataTable>

        <ListPagination
            :model-value="filters.page"
            :length="pages"
            :aria-label="t('admin-page.audit-pagination')"
            @update:model-value="handlePageChange"
        />
    </div>
</template>
