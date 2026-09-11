/**
 * @module
 * Pinia store for webhook subscriptions and their delivery log — two `useStructureCrudApi`
 * instances (subscriptions is full CRUD, deliveries is read + replay only), plus every
 * hand-written action that does not fit the generic shape.
 *
 * `createSubscription`/`rotateSecret` are hand-written rather than the generic `createOne`/
 * `updateOne`: both responses carry a plaintext secret meant to be shown exactly once, and the
 * generic path (`createTarget`/`updateTarget`) caches whatever the API call resolves to verbatim
 * — caching the raw response would park that plaintext in this store's state forever, readable by
 * anything with `getRecord(id)`. See `docs/modules/webhooks.md`.
 */
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useAsyncAction, useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import { useServerPageTotal } from '@/ui/composables/use-server-page-total.ts';
import {
    listWebhookSubscriptions,
    createWebhookSubscription,
    updateWebhookSubscription,
    deleteWebhookSubscription,
    listWebhookDeliveries,
    replayWebhookDelivery,
    listWebhookEvents
} from '@api';
import { translate } from '@/infrastructure/i18n';
import type { AxiosRequestConfig } from 'axios';
import type {
    WebhookSubscription,
    CreateWebhookSubscriptionRequest,
    UpdateWebhookSubscriptionRequest,
    WebhookDelivery,
    WebhookDeliveryStatus
} from '@types';

/** Search criteria for the subscriptions list — everything but pagination. */
interface SubscriptionFilters {
    enabled?: boolean;
}

/** Search criteria for the delivery log — everything but pagination. */
interface DeliveryFilters {
    subscriptionId?: string;
    status?: WebhookDeliveryStatus;
}

/**
 * The API's own page-size ceiling (`listWebhookSubscriptionsQueryPageSizeMax`), reused as the
 * "fetch everything this call can return" size for `fetchAllSubscriptions` — there is no true
 * unpaginated endpoint. A shop with more than this many subscriptions will not see the rest in the
 * deliveries filter dropdown or in Target/Edit hydration; acceptable, not worth a special case.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Webhook subscriptions, their delivery log, and the event catalogue that feeds both forms.
 *
 * See the users store for the shape this follows — one `defineStore`, `useStructureCrudApi` for
 * the generic reads/writes, hand-written actions alongside it for whatever does not fit.
 */
export const useWebhooksStore = defineStore('webhooks', () => {
    /**
     * Shared per-key loading flags, keyed internally by this store's name.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Subscriptions: full CRUD except `get` (no `GET .../subscriptions/{id}` exists — see
     * {@link watchSubscription}) and except `create` (see {@link createSubscription}).
     */
    const {
        itemDictionary: subscriptions,
        itemList: subscriptionsList,
        getRecord: getSubscription,
        editRecord: editSubscriptionRecord,
        selectedIdentifier: selectedSubscriptionId,
        selectedRecord: currentSubscription,

        filters: subscriptionFilters,
        loading: loadingSubscriptions,
        pageCurrent: subscriptionPageCurrent,
        pageSize: subscriptionPageSize,
        pageItemList: subscriptionPageItemList,

        fetchList: fetchAllSubscriptions,
        watchList: watchSubscriptionsSearch,
        updateOne: updateSubscription,
        deleteOne: deleteSubscription,
        fetchAny: fetchAnySubscriptions
    } = useStructureCrudApi<
        WebhookSubscription,
        string,
        SubscriptionFilters,
        CreateWebhookSubscriptionRequest,
        UpdateWebhookSubscriptionRequest,
        AxiosRequestConfig
    >(
        {
            // Backfills the cache for the deliveries filter dropdown and Target/Edit hydration —
            // not the list screen's own search, which is paginated below.
            list: () =>
                listWebhookSubscriptions({ pageSize: MAX_PAGE_SIZE }).then((r) => r.data.items),

            search: (filters, page, pageSize) =>
                listWebhookSubscriptions({ page, pageSize, enabled: filters.enabled }).then((r) => {
                    captureSubscriptionsTotal(r.data.meta.totalPages);
                    return r.data.items;
                }),

            update: (id, data, options) =>
                updateWebhookSubscription(id, data, options).then((r) => r.data),

            remove: (id) => deleteWebhookSubscription(id)
        },
        { loadingKey: 'webhooks-subscriptions', getLoading, setLoading }
    );

    /**
     * `pageTotal` for `search`'s real, server-paginated results — `captureTotal` is called from
     * `search:` above, once its response's `meta.totalPages` is in.
     */
    const { pageTotal: subscriptionsPageTotal, captureTotal: captureSubscriptionsTotal } =
        useServerPageTotal();

    /**
     * Selects a subscription by id for the Target/Edit pages, hydrating from the cache rather
     * than a fresh network call — there is no `GET .../subscriptions/{id}` endpoint to call one
     * with. Backfills the whole cache once if the id is not already known.
     *
     * @param idSource - a reactive source for the id, e.g. a route param getter
     * @returns A stop handle for the watcher
     */
    const watchSubscription = (idSource: () => string | undefined) =>
        watch(
            idSource,
            (id) => {
                selectedSubscriptionId.value = id;
                if (id && !getSubscription(id)) void fetchAllSubscriptions();
            },
            { immediate: true }
        );

    /**
     * Creates a subscription, minting its first secret.
     *
     * Hand-written rather than the generic `createOne`: see this module's docblock. `fetchAny`
     * runs the call with no caching at all; the non-secret fields are then cached by hand via
     * `editRecord`, and the full response (secret included) is returned to the caller so the
     * create view can still show the one-time reveal modal.
     *
     * @param data - url, description and event types for the new subscription
     * @returns The full response, including the plaintext `secret` — the caller must not persist
     *  it anywhere beyond the reveal modal
     */
    const createSubscription = (data: CreateWebhookSubscriptionRequest) =>
        fetchAnySubscriptions(() => createWebhookSubscription(data).then((r) => r.data)).then(
            (created) => {
                if (!created) return created;
                const { secret: _secret, newSecret: _newSecret, ...record } = created;
                editSubscriptionRecord(record, record.id);
                return created;
            }
        );

    /**
     * Mints a new secret onto an existing subscription's ring, without disturbing any secret
     * already on it — the ring carries both until {@link removeSecret} drops the old one.
     *
     * Same hand-written shape as {@link createSubscription} and for the same reason: `newSecret`
     * is a one-time plaintext reveal, never something this store's cache should hold.
     *
     * @param id - the subscription to rotate
     * @returns The full response, including the plaintext `newSecret`
     */
    const rotateSecret = (id: string) =>
        fetchAnySubscriptions(() =>
            updateWebhookSubscription(id, { rotateSecret: true }).then((r) => r.data)
        ).then((updated) => {
            if (!updated) return updated;
            const { secret: _secret, newSecret: _newSecret, ...record } = updated;
            editSubscriptionRecord(record, id);
            return updated;
        });

    /**
     * Drops one secret from a subscription's ring — the other half of a rotation, once every
     * consumer has switched to the new one. The response never carries a secret, so this is the
     * generic update path.
     *
     * @param id - the subscription to update
     * @param secretId - the ring entry to remove
     */
    const removeSecret = (id: string, secretId: string) =>
        updateSubscription(id, { removeSecretId: secretId });

    /**
     * Deliveries: read + replay only. No create/update/remove/get — a delivery is produced by the
     * backend's own worker, never authored here.
     */
    const {
        itemDictionary: deliveries,
        itemList: deliveriesList,

        filters: deliveryFilters,
        loading: loadingDeliveries,
        pageCurrent: deliveryPageCurrent,
        pageSize: deliveryPageSize,
        pageItemList: deliveryPageItemList,

        watchList: watchDeliveriesSearch,
        updateTarget: updateTargetDelivery
    } = useStructureCrudApi<WebhookDelivery, string, DeliveryFilters>(
        {
            search: (filters, page, pageSize) =>
                listWebhookDeliveries({
                    page,
                    pageSize,
                    subscriptionId: filters.subscriptionId,
                    status: filters.status
                }).then((r) => {
                    captureDeliveriesTotal(r.data.meta.totalPages);
                    deliveriesTotalItems.value = r.data.meta.totalItems;
                    return r.data.items;
                })
        },
        { loadingKey: 'webhooks-deliveries', getLoading, setLoading }
    );

    /**
     * `pageTotal` for the delivery log's server-paginated results, same rationale as
     * {@link subscriptionsPageTotal}.
     */
    const { pageTotal: deliveriesPageTotal, captureTotal: captureDeliveriesTotal } =
        useServerPageTotal();

    /**
     * Total delivery rows matching the current filters, across every page — what the "showing X
     * of Y" line counts with, as distinct from {@link deliveriesPageTotal}'s page count.
     */
    const deliveriesTotalItems = ref(0);

    /**
     * Re-sends one delivery synchronously and updates the same row in place with the outcome —
     * the single most-requested support action, per the backend's own doc comment.
     *
     * The response IS the full replacement record and carries nothing sensitive, so this is the
     * genuine `updateTarget` case — unlike the subscription actions above, no manual scrubbing is
     * needed.
     *
     * @param id - the delivery to replay
     */
    const replayDelivery = (id: string) =>
        updateTargetDelivery(() => replayWebhookDelivery(id).then((r) => r.data), {}, id);

    /**
     * The public event catalogue that feeds the `eventTypes` multiselect on the create/edit
     * forms. Not id-keyed and has no CRUD semantics, so it lives outside both
     * `useStructureCrudApi` instances above, same as `admin`'s dashboard reads.
     */
    const {
        data: eventCatalogueData,
        error: errorEventCatalogue,
        loading: loadingEventCatalogue,
        run: runEventCatalogue
    } = useAsyncAction(() => listWebhookEvents().then((r) => r.data), {
        fallbackErrorMessage: translate('webhooks-form.error-load-events')
    });

    /**
     * The event catalogue, or an empty list before the first successful call.
     */
    const eventCatalogue = computed(() => eventCatalogueData.value ?? []);

    /**
     * Loads the event catalogue; resolves into {@link errorEventCatalogue} rather than rejecting.
     */
    const fetchEventCatalogue = () => runEventCatalogue().then(() => undefined);

    return {
        subscriptions,
        subscriptionsList,
        getSubscription,
        selectedSubscriptionId,
        currentSubscription,

        subscriptionFilters,
        loadingSubscriptions,
        subscriptionPageCurrent,
        subscriptionPageSize,
        subscriptionsPageTotal,
        subscriptionPageItemList,

        fetchAllSubscriptions,
        watchSubscriptionsSearch,
        watchSubscription,
        createSubscription,
        updateSubscription,
        deleteSubscription,
        rotateSecret,
        removeSecret,

        deliveries,
        deliveriesList,
        deliveryFilters,
        loadingDeliveries,
        deliveryPageCurrent,
        deliveryPageSize,
        deliveriesPageTotal,
        deliveryPageItemList,
        deliveriesTotalItems,
        watchDeliveriesSearch,
        replayDelivery,

        eventCatalogue,
        loadingEventCatalogue,
        errorEventCatalogue,
        fetchEventCatalogue
    };
});
