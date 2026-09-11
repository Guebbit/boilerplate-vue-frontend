<script setup lang="ts">
/**
 * @module
 * The delivery log's filter bar, table and pager. Owns the filter form's local state and turns
 * it into the parent's `search` emit; everything renders declaratively off the props the parent
 * feeds back in, so this component never fetches anything itself — same split
 * `admin/components/AdminAuditTab.vue` uses, filters/table/pager together in one component.
 */
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { Search, RotateCw } from 'lucide-vue-next';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { EMPTY_VALUE, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import type { WebhookDeliveryFilters } from '@/modules/webhooks/types.ts';
import type { WebhookDelivery, WebhookDeliveryStatus, WebhookSubscription } from '@types';

/**
 * i18n translator for this component's template and messages.
 */
const { t } = useI18n();

/**
 * Delivery rows, pagination totals, the subscriptions the subscription filter offers, the
 * parent's load state, and which delivery ids currently have a replay in flight.
 */
const props = defineProps<{
    deliveries: WebhookDelivery[];
    total: number;
    pages: number;
    loading: boolean;
    subscriptions: WebhookSubscription[];
    replayingIds: Set<string>;
    initialFilters?: Partial<WebhookDeliveryFilters>;
}>();

/**
 * Events this bar raises toward the parent view.
 */
const emit = defineEmits<{
    /**
     * The visitor asked for a filtered page. The parent owns the fetching — and the URL query
     * sync that makes this screen bookmarkable — which a callback prop invoked here could only
     * duplicate.
     */
    search: [filters: WebhookDeliveryFilters];
    /**
     * The visitor asked to replay one delivery. The parent owns the call so it can also own the
     * in-flight `replayingIds` set this component reads back.
     */
    replay: [id: string];
}>();

/**
 * Live filter form state, sent as-is to the parent's search handler. Seeded from
 * `initialFilters` so a deep link (e.g. "view deliveries for this subscription", from the
 * subscription detail page) renders with the right filter already applied.
 */
const filters = reactive<WebhookDeliveryFilters>({
    subscriptionId: props.initialFilters?.subscriptionId,
    status: props.initialFilters?.status,
    page: props.initialFilters?.page ?? 1
});

/**
 * Options of the subscription select — every known subscription, by URL rather than by its
 * (meaningless to a reader) id.
 *
 * @returns The "all subscriptions" option first, then one per subscription in the cache.
 */
const subscriptionOptions = computed(() => [
    { value: undefined, label: t('webhook-deliveries-page.filter-subscription-all') },
    ...props.subscriptions.map((subscription) => ({
        value: subscription.id,
        label: subscription.url
    }))
]);

/**
 * Options of the status select.
 *
 * @returns The localized "all statuses" choice plus one per {@link WebhookDeliveryStatus}.
 */
const statusOptions = computed(() => [
    { value: undefined, label: t('webhook-deliveries-page.filter-status-all') },
    { value: 'pending', label: t('webhook-deliveries-page.status-pending') },
    { value: 'in-flight', label: t('webhook-deliveries-page.status-in-flight') },
    { value: 'succeeded', label: t('webhook-deliveries-page.status-succeeded') },
    { value: 'failed', label: t('webhook-deliveries-page.status-failed') },
    { value: 'exhausted', label: t('webhook-deliveries-page.status-exhausted') }
]);

/**
 * Columns of the deliveries table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<WebhookDelivery>[]>(() => [
    { title: t('webhook-deliveries-page.column-created-at'), key: 'createdAt' },
    { title: t('webhook-deliveries-page.column-subscription'), key: 'subscriptionId' },
    { title: t('webhook-deliveries-page.column-event-type'), key: 'eventType' },
    { title: t('webhook-deliveries-page.column-attempt'), key: 'attempt' },
    { title: t('webhook-deliveries-page.column-status'), key: 'status' },
    { title: t('webhook-deliveries-page.column-response-code'), key: 'responseCode' },
    { title: t('webhook-deliveries-page.column-duration'), key: 'durationMs' },
    { title: t('webhook-deliveries-page.column-error'), key: 'error' },
    { title: t('webhook-deliveries-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Resolves a subscription id to its URL for display, since the raw id means nothing to a reader.
 *
 * @param subscriptionId - The delivery row's `subscriptionId`.
 * @returns The subscription's URL, or the id itself when the subscription is not in the cache
 *  (e.g. deleted since).
 */
const subscriptionLabel = (subscriptionId: string) =>
    props.subscriptions.find((subscription) => subscription.id === subscriptionId)?.url ??
    subscriptionId;

/**
 * Localized label of a delivery's status.
 *
 * @param status - The delivery row's `status`.
 */
const statusLabel = (status: WebhookDeliveryStatus) =>
    t(`webhook-deliveries-page.status-${status}`);

/**
 * Chip color for a delivery's status — greyed while still in progress, the verdict color once
 * settled.
 *
 * @param status - The delivery row's `status`.
 */
const statusColor = (status: WebhookDeliveryStatus) => {
    if (status === 'succeeded') return 'success';
    if (status === 'failed' || status === 'exhausted') return 'error';
    return 'secondary';
};

/**
 * Runs the search with the current filters, back to the first page — the previous page number
 * belongs to the previous filter set.
 */
const handleSearch = () => {
    filters.page = 1;
    emit('search', { ...filters });
};

/**
 * Turning the pager re-runs the search on that page.
 *
 * @param page - The 1-based page the pager moved to.
 */
const handlePageChange = (page: number) => {
    filters.page = page;
    emit('search', { ...filters });
};
</script>

<template>
    <div class="grid gap-4">
        <v-card class="p-5" variant="flat" border>
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    <v-select
                        v-model="filters.subscriptionId"
                        :items="subscriptionOptions"
                        item-title="label"
                        item-value="value"
                        :label="t('webhook-deliveries-page.filter-subscription')"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                    <v-select
                        v-model="filters.status"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        :label="t('webhook-deliveries-page.filter-status')"
                        hide-details
                        @update:model-value="handleSearch"
                    />
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="props.loading">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <p class="m-0 text-sm opacity-70" role="status">
            {{
                t('webhook-deliveries-page.showing', {
                    shown: props.deliveries.length,
                    total: props.total
                })
            }}
        </p>

        <DataTable
            :headers="tableHeaders"
            :items="props.deliveries"
            :caption="t('webhook-deliveries-page.table-caption')"
            :loading="props.loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.createdAt`]="{ item }">
                <span class="whitespace-nowrap">{{ formatDateTime(item.createdAt) }}</span>
            </template>

            <template v-slot:[`item.subscriptionId`]="{ item }">
                {{ subscriptionLabel(item.subscriptionId) }}
            </template>

            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="statusColor(item.status)">
                    {{ statusLabel(item.status) }}
                </v-chip>
            </template>

            <template v-slot:[`item.responseCode`]="{ item }">
                {{ item.responseCode ?? EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.durationMs`]="{ item }">
                {{
                    item.durationMs !== undefined
                        ? t('webhook-deliveries-page.duration-ms', { ms: item.durationMs })
                        : EMPTY_VALUE
                }}
            </template>

            <template v-slot:[`item.error`]="{ item }">
                <span v-if="item.error" :title="item.error" class="line-clamp-1 max-w-48 text-xs">
                    {{ item.error }}
                </span>
                <span v-else>{{ EMPTY_VALUE }}</span>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                    size="small"
                    variant="tonal"
                    color="secondary"
                    :disabled="item.status === 'in-flight' || props.replayingIds.has(item.id)"
                    :loading="props.replayingIds.has(item.id)"
                    :aria-label="t('webhook-deliveries-page.button-replay-named', { id: item.id })"
                    @click="emit('replay', item.id)"
                >
                    <RotateCw :size="14" class="mr-1" aria-hidden="true" />
                    {{ t('webhook-deliveries-page.button-replay') }}
                </v-btn>
            </template>
        </DataTable>

        <ListPagination
            :model-value="filters.page"
            :length="props.pages"
            @update:model-value="handlePageChange"
        />
    </div>
</template>
