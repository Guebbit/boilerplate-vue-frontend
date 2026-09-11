<script lang="ts">
export default {
    name: 'WebhookDeliveriesPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Delivery log page. Wires the store's paginated search to `WebhookDeliveriesFilters` and keeps
 * the current filters in the route's query string, so a filtered view (e.g. "failed deliveries
 * for subscription X") can be bookmarked or handed to support — the reason this is its own route
 * rather than a tab, see `docs/modules/webhooks.md`.
 */
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '@/modules/webhooks/store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import WebhookDeliveriesFilters from '@/modules/webhooks/components/WebhookDeliveriesFilters.vue';
import type { WebhookDeliveryFilters } from '@/modules/webhooks/types.ts';
import type { WebhookDeliveryStatus } from '@types';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Current route, read for its query string on load, and the router, to keep it in sync with
 * every search this page runs.
 */
const route = useRoute();
const router = useRouter();

/**
 * Webhooks store actions.
 */
const { fetchAllSubscriptions, watchDeliveriesSearch, replayDelivery } = useWebhooksStore();

/**
 * Webhooks store reactive state — both the deliveries being searched and the subscriptions cache
 * the subscription filter's dropdown reads from.
 */
const {
    subscriptionsList,
    deliveryFilters,
    deliveryPageCurrent,
    deliveryPageItemList,
    deliveriesPageTotal,
    deliveriesTotalItems,
    loadingDeliveries
} = storeToRefs(useWebhooksStore());

onMounted(() => void fetchAllSubscriptions());

/**
 * The filters this page loaded with, read once from the URL query so a deep link (a bookmark, or
 * the "view deliveries" link off a subscription's detail page) renders pre-filtered.
 */
const initialFilters: Partial<WebhookDeliveryFilters> = {
    subscriptionId:
        typeof route.query.subscriptionId === 'string' ? route.query.subscriptionId : undefined,
    status:
        typeof route.query.status === 'string'
            ? (route.query.status as WebhookDeliveryStatus)
            : undefined,
    page: Number(route.query.page) > 0 ? Number(route.query.page) : 1
};

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting a failed request
 * as a toast.
 */
const { search } = watchDeliveriesSearch({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Applies a filter change from the filter bar: updates the store's own filter/page state, mirrors
 * it into the URL query so the view is bookmarkable, and re-runs the search.
 *
 * @param filters - The filter bar's current filters, page included.
 * @returns The search promise, resolving once the page is loaded.
 */
const handleSearch = (filters: WebhookDeliveryFilters) => {
    deliveryFilters.value = { subscriptionId: filters.subscriptionId, status: filters.status };
    deliveryPageCurrent.value = filters.page;
    void router.replace({
        query: {
            ...(filters.subscriptionId && { subscriptionId: filters.subscriptionId }),
            ...(filters.status && { status: filters.status }),
            ...(filters.page > 1 && { page: filters.page })
        }
    });
    return search();
};

/**
 * Delivery ids with a replay currently in flight, so only that row's button shows a spinner
 * rather than the whole table freezing on the store's blanket `loadingDeliveries`.
 */
const replayingIds = reactive(new Set<string>());

/**
 * Replays one delivery and reports the outcome as a toast — the cache updates in place via the
 * store's `replayDelivery`, so no re-fetch is needed.
 *
 * @param id - The delivery to replay.
 */
const handleReplay = (id: string) => {
    replayingIds.add(id);
    return replayDelivery(id)
        .then(() => addMessage(t('webhook-deliveries-page.success-replay')))
        .catch((error: unknown) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            replayingIds.delete(id);
        });
};

// The initial load: seed the store's filters/page from the URL, then run the first search.
deliveryFilters.value = {
    subscriptionId: initialFilters.subscriptionId,
    status: initialFilters.status
};
deliveryPageCurrent.value = initialFilters.page ?? 1;
void search();
</script>

<template>
    <LayoutDefault id="webhook-deliveries-page" :title="t('webhook-deliveries-page.page-title')">
        <WebhookDeliveriesFilters
            :deliveries="deliveryPageItemList"
            :total="deliveriesTotalItems"
            :pages="deliveriesPageTotal"
            :loading="loadingDeliveries"
            :subscriptions="subscriptionsList"
            :replaying-ids="replayingIds"
            :initial-filters="initialFilters"
            @search="handleSearch"
            @replay="handleReplay"
        />
    </LayoutDefault>
</template>
