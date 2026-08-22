<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { Search } from 'lucide-vue-next';
import type { AuditEventItem } from '@types';
import type { AdminAuditFilters } from '@/modules/admin/types.ts';
import { EMPTY_VALUE, formatDateTime } from '@/infrastructure/utils/formatters.ts';

const { t } = useI18n();

const props = defineProps<{
    auditEvents: AuditEventItem[];
    total: number;
    pages: number;
    loading: boolean;
    error?: string;
}>();

const emit = defineEmits<{
    /**
     * The visitor asked for a filtered page. The parent owns the fetching — and owns the
     * rejection with it, which a callback prop invoked here could only swallow.
     */
    search: [filters: AdminAuditFilters];
}>();

/** What the table asks for when nobody has chosen. */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Live audit filter form state, sent as-is to the parent's search callback.
 */
const filters = reactive<AdminAuditFilters>({
    actor: undefined,
    action: undefined,
    outcome: undefined,
    since: undefined,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE
});

/**
 * Options of the outcome select.
 *
 * @returns The localized `all`/`success`/`failure` choices.
 */
const outcomeOptions = computed(() => [
    { value: undefined, label: t('admin-page.audit-filter-outcome-all') },
    { value: 'success', label: t('admin-page.audit-filter-outcome-success') },
    { value: 'failure', label: t('admin-page.audit-filter-outcome-failure') }
]);

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
const tableHeaders = computed<CoreDataTableHeader<AuditEventItem>[]>(() => [
    { title: t('admin-page.audit-col-timestamp'), key: 'timestamp' },
    { title: t('admin-page.audit-col-actor'), key: 'actor_user_id' },
    { title: t('admin-page.audit-col-role'), key: 'actor_role' },
    { title: t('admin-page.audit-col-action'), key: 'action' },
    { title: t('admin-page.audit-col-outcome'), key: 'outcome' },
    { title: t('admin-page.audit-col-ip'), key: 'ip' },
    { title: t('admin-page.audit-col-request-id'), key: 'request_id' },
    { title: t('admin-page.audit-col-trace-id'), key: 'trace_id' }
]);

/**
 * Runs the search with the current filters.
 */
const handleSearch = () => {
    // Back to the first page: the previous page number belongs to the previous result set.
    filters.page = 1;
    emit('search', { ...filters });
};

/**
 * Turning the pager re-runs the search on that page.
 *
 * The page lives in the filter bag rather than in separate state: the trail is append-only and
 * paged from the newest end, so a page number that outlived its filters would point at a
 * different set of rows than the one the visitor was reading.
 *
 * @param page - The 1-based page the pager moved to.
 */
const handlePageChange = (page: number) => {
    filters.page = page;
    emit('search', { ...filters });
};

/**
 * Clears every filter (keeping the default page size) and re-runs the search.
 */
const handleReset = () => {
    filters.actor = undefined;
    filters.action = undefined;
    filters.outcome = undefined;
    filters.since = undefined;
    filters.page = 1;
    filters.pageSize = DEFAULT_PAGE_SIZE;
    emit('search', { ...filters });
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
</script>

<template>
    <div class="grid gap-4">
        <v-card class="p-5" variant="flat" border>
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                    <v-text-field
                        v-model="filters.actor"
                        type="text"
                        :label="t('admin-page.audit-filter-actor')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.action"
                        type="text"
                        :label="t('admin-page.audit-filter-action')"
                        hide-details
                    />
                    <v-select
                        v-model="filters.outcome"
                        :items="outcomeOptions"
                        item-title="label"
                        item-value="value"
                        :label="t('admin-page.audit-filter-outcome-all')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.since"
                        type="datetime-local"
                        :label="t('admin-page.audit-filter-since')"
                        hide-details
                    />
                    <v-select
                        v-model="filters.pageSize"
                        :items="pageSizeOptions"
                        :label="t('generic.page-size')"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="props.loading">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                </div>
            </form>
        </v-card>

        <p class="m-0 text-sm opacity-70" role="status">
            {{
                t('admin-page.audit-showing', {
                    shown: props.auditEvents.length,
                    total: props.total
                })
            }}
        </p>

        <v-alert v-if="props.error" type="error" :text="props.error" />

        <DataTable
            v-else
            :headers="tableHeaders"
            :items="props.auditEvents"
            :caption="t('admin-page.audit-table-caption')"
            :loading="props.loading"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.timestamp`]="{ item }">
                <span class="whitespace-nowrap">{{ formatDateTime(item.timestamp) }}</span>
            </template>

            <template v-slot:[`item.actor_role`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.actor_role === 'admin' ? 'tertiary' : 'secondary'"
                >
                    {{ item.actor_role }}
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

            <template v-slot:[`item.request_id`]="{ item }">
                <!--
                    The full id for the reader too — a title alone is mouse-only. As hidden text
                    rather than an `aria-label`: a role-less span may not carry a name
                    (`aria-prohibited-attr`), and the visible span is hidden from the reader so
                    the id is not announced twice.
                -->
                <span :title="item.request_id" class="font-mono text-xs" aria-hidden="true">
                    {{ truncateId(item.request_id) }}
                </span>
                <span class="sr-only">{{ item.request_id }}</span>
            </template>

            <template v-slot:[`item.trace_id`]="{ item }">
                <span :title="item.trace_id" class="font-mono text-xs" aria-hidden="true">
                    {{ truncateId(item.trace_id) }}
                </span>
                <span class="sr-only">{{ item.trace_id }}</span>
            </template>
        </DataTable>

        <ListPagination
            :model-value="filters.page"
            :length="props.pages"
            :aria-label="t('admin-page.audit-pagination')"
            @update:model-value="handlePageChange"
        />
    </div>
</template>
