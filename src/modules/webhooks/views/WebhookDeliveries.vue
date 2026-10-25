<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'WebhookDeliveriesPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Delivery log page. Wires the store's paginated search to `WebhookDeliveriesFilters` and keeps
 * the current filters in the route's query string (`useListUrlState`, like every other list), so a
 * filtered view (e.g. "failed deliveries for subscription X") can be bookmarked or handed to
 * support — the reason this is its own route rather than a tab, see `docs/modules/webhooks.md`.
 */
import { onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useWebhooksStore } from '../store';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import WebhookDeliveriesFilters from '../components/WebhookDeliveriesFilters.vue';
import type { WebhookDeliveryFilters } from '../types.ts';
import { WebhookDeliveryStatus } from '@/types/enums.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

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
 * Keeps the filters and page in the URL: a deep link (a bookmark, or the "view deliveries" link off
 * a subscription's detail page) renders pre-filtered, and a reload keeps the view. Hydrates the
 * store's filters on this call; `sync` writes them back after a search.
 */
const { sync: syncUrl } = useListUrlState({
    filters: deliveryFilters,
    page: deliveryPageCurrent,
    // The status travels as one of the closed set, so a hand-edited value is ignored, not sent.
    params: { subscriptionId: 'string', status: Object.values(WebhookDeliveryStatus) }
});

/**
 * The filter bar's starting state: whatever the URL (or the previous visit) left in the store.
 */
const initialFilters: WebhookDeliveryFilters = {
    subscriptionId: deliveryFilters.value.subscriptionId,
    status: deliveryFilters.value.status,
    page: deliveryPageCurrent.value
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
    syncUrl();
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

// The initial load: the store already holds the URL's filters, so run the first search.
void search();
</script>

<template>
    <div id="webhook-deliveries-page">
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
    </div>
</template>
