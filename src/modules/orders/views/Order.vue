<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OrderTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Order detail page for both the customer and the operator. Loads one order
 * by route id, forces a detail re-fetch when the cached record lacks
 * `actions`, and mounts the payment/transfer-instructions/shipment panels as
 * self-contained published-language components.
 */
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { shopCurrency } from '@/infrastructure/shop.ts';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '../store.ts';
import { leftOutByReorder } from '../domain';
import OrderTimeline from '../components/OrderTimeline.vue';
import { useOrderActionsRefetch } from '../composables/use-order-actions-refetch.ts';
import { useOrderDocuments } from '../composables/use-order-documents.ts';
import { useOrderHero } from '../composables/use-order-hero.ts';
import { useCartStore } from '@/modules/cart';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    Calendar,
    Circle,
    Clock,
    CreditCard,
    Download,
    Euro,
    Eye,
    FileText,
    ReceiptText,
    Hash,
    Mail,
    MapPin,
    ShoppingCart,
    Truck,
    Undo2
} from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    formatAddressLine,
    formatText,
    formatDate,
    formatDateTime,
    formatCurrency,
    formatPercent
} from '@/infrastructure/utils/formatters.ts';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { PaymentPanel } from '@/modules/payments';
import { WithdrawalPanel } from '@/modules/returns';
import { ShipmentPanel, ShippingMethodName } from '@/modules/delivery';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import TourButton from '@/ui/molecules/TourButton.vue';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Route order id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store API and reactive order references.
 */
const { watchOrder, fetchOrder, cancelOrder } = useOrdersStore();

/**
 * The session, for the `meta.can` rules that gate the "History" link and the "Edit" button — a
 * reader who cannot read the audit trail or edit the order should not see a link that 403s.
 */
const session = useSessionStore();

/**
 * The order being displayed, and whether it is in flight.
 */
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * Refills the visitor's cart from this order — the reorder button.
 */
const { reorder } = useCartStore();

/**
 * Whether a reorder is in flight. `reorder` runs under the CART store's `fetchAny`, a
 * different loading flag from {@link loading} above (the orders store's own) — the reorder
 * button has to disable on this one, or a double-click fires the request twice.
 */
const { loading: reorderLoading } = storeToRefs(useCartStore());

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * The audit-log link the history button offers, for the order currently shown — `undefined`,
 * hiding the button entirely, on a build with no `admin` module: `admin` is not a coupling this
 * module's `MODULE_EDGES` entry declares, so it is guarded rather than assumed. The
 * button's own `session.can('read', 'AuditLog')` check stays alongside it — one answers "does
 * this build even have an audit log", the other "may THIS visitor see it".
 */
const auditLogTo = computed(() =>
    currentOrder.value
        ? linkIfRouted(router, 'AuditLog', undefined, { target: currentOrder.value.id })
        : undefined
);

/**
 * Changes whenever the order moves — status, money, parcels, returns or any edit — so the timeline
 * reads again instead of showing the state before.
 */
const timelineRefreshKey = computed(() =>
    [
        currentOrder.value?.status,
        currentOrder.value?.paymentStatus,
        currentOrder.value?.fulfillmentStatus,
        currentOrder.value?.returnStatus,
        currentOrder.value?.updatedAt
    ].join('|')
);

/**
 * Whether the cancel is still open, as the SERVER answers it for this caller.
 *
 * Read rather than re-derived: which statuses allow a cancel depends on the caller's role and on
 * rules that live in the API's order lifecycle. A copy of them here would be a second opinion in a
 * separately deployed codebase, and the first edge that changed would leave this button offering
 * something the API refuses.
 *
 * @returns `true` while this order can still be cancelled by whoever is looking at it.
 */
const cancellable = computed(() => currentOrder.value?.actions?.cancel === true);

/**
 * The order's own frozen currency — every price on this page is `currentOrder`'s own money,
 * never the shop's current default. The shop's currency only stands in while no order is loaded.
 */
const orderCurrency = computed(() => currentOrder.value?.currency ?? shopCurrency.value);

/**
 * The cancel button's own blocked state — its own dedicated control, so a failure blocks it in
 * place rather than joining the toast queue.
 */
const {
    message: cancelError,
    report: reportCancelError,
    clear: clearCancelError
} = useBlockingError();

/**
 * Cancels this order after an explicit confirmation. A second press while the first is still
 * asking or writing does nothing, so a double press cancels once.
 *
 * @returns Nothing; success is reported as a toast, a failure blocks the button in place
 *  ({@link cancelError}), and the page re-renders the new status either way.
 */
const handleCancel = singleFlight(() => {
    const order = currentOrder.value;
    if (!order) return;
    return useDialogStore()
        .confirm({
            message: t('order-target-page.confirm-cancel', { id: order.id }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearCancelError();
            return cancelOrder(order.id)
                .then(() => addMessage(t('order-target-page.success-cancel')))
                .catch((error) => reportCancelError(error));
        });
});

/**
 * The reorder button's own blocked state — its own dedicated control, separate from cancel.
 */
const {
    message: reorderError,
    report: reportReorderError,
    clear: clearReorderError
} = useBlockingError();

/**
 * Copies this order's lines back into the cart and goes there — products that have since left
 * the catalogue are skipped server-side, so the toast names what the cart did NOT get.
 *
 * @returns Nothing; the outcome is reported as a toast and navigates to the cart, a failure blocks
 *  the button in place ({@link reorderError}).
 */
const handleReorder = () => {
    const order = currentOrder.value;
    if (!order) return;
    clearReorderError();
    reorder(order.id)
        .then((cart) => {
            const leftOut = leftOutByReorder(
                order.items,
                (cart?.items ?? []).map(({ productId }) => productId)
            );
            if (leftOut.length === 0) addMessage(t('order-target-page.success-reorder'));
            else
                addMessage(
                    t('order-target-page.warning-reorder-left-out', { titles: leftOut.join(', ') }),
                    EToastType.WARNING
                );
            return router.push(routerLinkI18n({ name: 'Cart' }));
        })
        .catch((error) => reportReorderError(error));
};

/**
 * Hero heading, subheading and translated status.
 */
const { heroTitle, heroDescription, orderStatus } = useOrderHero(
    currentOrder,
    () => id,
    'order-target-page.page-title'
);

/**
 * The frozen shipping address, one line — whoever fulfils the order needs to see it without
 * opening the address book, which may since have changed or lost the entry this order was placed
 * against. Absent on an order with nothing to ship to an address (digital-only, or a pickup).
 */
const shippingAddressText = computed(() => formatAddressLine(currentOrder.value?.shippingAddress));

/**
 * The frozen billing address, one line — the address the invoice is made out to. Every order a
 * checkout placed carries one, whether or not anything ships.
 */
const billingAddressText = computed(() => formatAddressLine(currentOrder.value?.billingAddress));

/**
 * The invoice and its credit notes: whether they exist, the download/view actions, and each
 * action's own loading and blocked state.
 */
const {
    invoiceAvailable,
    invoiceLoading,
    invoiceError,
    downloadInvoice,
    viewInvoice,
    creditNotes,
    creditNoteLoadingId,
    creditNoteError,
    downloadCreditNote
} = useOrderDocuments(currentOrder, () => id);

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and (re)fetches the order whenever the route id changes.
 *
 * The forced fetch below is not a duplicate of it. The list seeds the cache with SUMMARY rows,
 * and `watchOrder` is cache-first — arriving from the orders list, it would settle for that row
 * and never ask the API. But the DETAIL representation is the one carrying `actions` — which
 * buttons this caller may press, answered by the server's own lifecycle rules — and only
 * `GET /orders/:id` serves it. Drop the forced fetch and the page renders with no action buttons
 * at all for anyone who arrived from the list, which looks like an order nothing may be done to.
 */
watchOrder(() => id, { onError: onMissingRecord });

/**
 * Forces the one re-fetch a list-cache arrival needs to gain `actions` — see the composable's
 * own docs for why a second forced fetch must not race it.
 */
useOrderActionsRefetch(currentOrder, () => id, fetchOrder);
</script>

<template>
    <div id="order-target">
        <ItemDetailLayout accent="tertiary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentOrder?.id"
                >
                    <template #icon><ShoppingCart :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('order-target-page.label-status')"
                    :value="orderStatus"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-total')"
                    :value="formatCurrency(currentOrder?.totalPrice, orderCurrency)"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-items')"
                    :value="currentOrder?.items?.length ?? 0"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentOrder" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('order-target-page.label-order-id')"
                        :value="currentOrder.id"
                        :icon="Hash"
                    />
                    <ItemDetailField :label="t('order-target-page.label-status')" :icon="Circle">
                        <v-chip variant="tonal" color="tertiary" class="font-semibold">
                            {{ orderStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('order-target-page.label-total')"
                        :value="formatCurrency(currentOrder.totalPrice, orderCurrency)"
                        :icon="Euro"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-payment-status')"
                        :icon="CreditCard"
                    >
                        <v-chip variant="tonal" data-test="order-payment-status">
                            {{
                                t(`order-target-page.payment-status-${currentOrder.paymentStatus}`)
                            }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('order-target-page.label-fulfillment-status')"
                        :icon="Truck"
                    >
                        <v-chip variant="tonal" data-test="order-fulfillment-status">
                            {{
                                t(
                                    `order-target-page.fulfillment-status-${currentOrder.fulfillmentStatus}`
                                )
                            }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        v-if="currentOrder.returnStatus !== 'none'"
                        :label="t('order-target-page.label-return-status')"
                        :icon="Undo2"
                    >
                        <v-chip variant="tonal" data-test="order-return-status">
                            {{ t(`order-target-page.return-status-${currentOrder.returnStatus}`) }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('orders-list-page.filter-email')"
                        :value="formatText(currentOrder.email)"
                        :icon="Mail"
                    />
                    <ItemDetailField
                        v-if="currentOrder.paymentMethod"
                        :label="t('order-target-page.label-payment-method')"
                        :value="t(`payment-method-selector.method-${currentOrder.paymentMethod}`)"
                        :icon="CreditCard"
                        data-test="order-payment-method"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-notes')"
                        :value="formatText(currentOrder.notes)"
                        :icon="FileText"
                        full-width
                        data-test="order-notes"
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('order-target-page.loading') }}</p>
            </CardDetail>

            <CardDetail v-if="currentOrder">
                <div data-tour="order-timeline">
                    <OrderTimeline
                        :order-id="currentOrder.id"
                        :owner-id="currentOrder.userId"
                        :refresh-key="timelineRefreshKey"
                    />
                </div>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <div v-if="session.can('display', 'Order')" class="flex justify-end">
                        <TourButton tour="order-staff" />
                    </div>
                    <!-- The money and the parcel: each panel re-reads the order when its module
                         moves the status, so this page never guesses at either. -->
                    <div v-if="currentOrder" data-tour="order-payment">
                        <PaymentPanel
                            :order-id="currentOrder.id"
                            :order-payable="currentOrder.actions?.pay"
                            :order-status="currentOrder.status"
                            :pay-by="currentOrder.payBy"
                            @paid="fetchOrder(currentOrder.id, { forced: true })"
                        />
                    </div>
                    <div v-if="currentOrder" data-tour="order-shipment">
                        <ShipmentPanel
                            :order-id="currentOrder.id"
                            :shipping-method-id="currentOrder.shippingMethod"
                            :can-start="currentOrder.actions?.start ?? false"
                            :override="currentOrder.actions?.override ?? []"
                            @moved="fetchOrder(currentOrder.id, { forced: true })"
                        />
                    </div>
                    <WithdrawalPanel
                        v-if="currentOrder"
                        :order-id="currentOrder.id"
                        :can-withdraw="currentOrder.actions?.withdraw ?? false"
                        :withdraw-blocked="currentOrder.actions?.withdrawBlocked"
                        :withdraw-until="currentOrder.actions?.withdrawUntil"
                        :order-number="currentOrder.orderNumber"
                        @opened="fetchOrder(currentOrder.id, { forced: true })"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        v-if="currentOrder?.shippingMethod"
                        :label="t('order-target-page.label-shipping')"
                        :icon="Truck"
                        data-test="order-shipping"
                    >
                        <ShippingMethodName :id="currentOrder.shippingMethod" />
                        —
                        {{ formatCurrency(currentOrder.shippingCost ?? 0, orderCurrency) }}
                    </ItemDetailField>
                    <ItemDetailField
                        v-if="shippingAddressText"
                        :label="t('order-target-page.label-shipping-address')"
                        :value="shippingAddressText"
                        :icon="MapPin"
                        full-width
                        data-test="order-shipping-address"
                    />
                    <ItemDetailField
                        v-if="billingAddressText"
                        :label="t('order-target-page.label-billing-address')"
                        :value="billingAddressText"
                        :icon="ReceiptText"
                        full-width
                        data-test="order-billing-address"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        :icon="Clock"
                    />

                    <div>
                        <h3 class="m-0 text-base font-semibold">
                            {{ t('order-target-page.label-items') }}
                        </h3>
                        <div v-if="currentOrder?.items?.length" class="mt-3 grid gap-3">
                            <article
                                v-for="item in currentOrder.items"
                                :key="'order-item-' + item.product.id"
                                data-test="order-item"
                                class="rounded-2xl border border-on-surface/10 bg-on-surface/3 p-4"
                            >
                                <div class="flex items-start gap-3">
                                    <!--
                                        The picture is resolved LIVE against the catalogue product
                                        (`item.current`), never frozen. `current` is `null` once that
                                        product is hard-deleted, and carries no `imageUrl` when it
                                        never had a picture; `LazyImage` draws its own placeholder
                                        for both.
                                    -->
                                    <LazyImage
                                        :src="item.current?.imageUrl"
                                        :thumbnail-src="item.current?.thumbnailUrl"
                                        :alt="
                                            t('order-target-page.image-alt', {
                                                name: item.product.title || item.product.id
                                            })
                                        "
                                        :width="56"
                                        :height="56"
                                    />
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="mb-2 flex items-center justify-between gap-3 font-semibold"
                                        >
                                            <span>{{ item.product.title || item.product.id }}</span>
                                            <v-chip
                                                size="small"
                                                variant="tonal"
                                                color="tertiary"
                                                class="shrink-0"
                                            >
                                                × {{ item.quantity }}
                                            </v-chip>
                                        </div>
                                        <p
                                            v-if="item.product.preorder"
                                            class="m-0 mb-2 text-sm opacity-75"
                                            data-test="order-item-preorder"
                                        >
                                            {{
                                                t('order-target-page.preorder-line', {
                                                    date: formatDate(item.product.releaseDate)
                                                })
                                            }}
                                        </p>
                                        <p
                                            v-if="item.backorderedQuantity"
                                            class="m-0 mb-2 text-sm opacity-75"
                                            data-test="order-item-owed"
                                        >
                                            {{
                                                item.promiseDated
                                                    ? t('order-target-page.owed-line', {
                                                          count: item.backorderedQuantity,
                                                          date: formatDate(item.promisedAt)
                                                      })
                                                    : t('order-target-page.owed-line-undated', {
                                                          count: item.backorderedQuantity
                                                      })
                                            }}
                                        </p>
                                        <p
                                            v-if="item.product.noWithdrawal"
                                            class="m-0 mb-2 text-sm opacity-75"
                                            data-test="order-item-no-withdrawal"
                                        >
                                            {{ t('order-target-page.no-withdrawal') }}
                                        </p>
                                        <div class="flex items-center justify-between gap-3">
                                            <p class="m-0 opacity-75">
                                                {{ t('order-target-page.label-product-id') }}
                                            </p>
                                            <strong class="min-w-0 wrap-anywhere">{{
                                                item.product.id
                                            }}</strong>
                                        </div>
                                        <!-- The response already carries the frozen unit
                                             price and this order's own currency — line total is
                                             derived here, not re-fetched or re-priced. -->
                                        <div
                                            class="flex items-center justify-between gap-3"
                                            data-test="order-item-unit-price"
                                        >
                                            <p class="m-0 opacity-75">
                                                {{ t('order-target-page.label-unit-price') }}
                                            </p>
                                            <strong>
                                                {{
                                                    formatCurrency(
                                                        item.product.price,
                                                        orderCurrency
                                                    )
                                                }}
                                            </strong>
                                        </div>
                                        <div
                                            class="flex items-center justify-between gap-3"
                                            data-test="order-item-line-total"
                                        >
                                            <p class="m-0 opacity-75">
                                                {{ t('order-target-page.label-line-total') }}
                                            </p>
                                            <strong>
                                                {{
                                                    formatCurrency(
                                                        item.product.price * item.quantity,
                                                        orderCurrency
                                                    )
                                                }}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </div>
                        <p v-else class="m-0 mt-2 opacity-75">{{ t('generic.no-data') }}</p>
                    </div>

                    <!--
                        Absent on a pre-VAT order — `taxSummary` is only present once every line
                        carries a frozen rate. One row per distinct rate, goods and shipping's own
                        apportioned share folded together (`shared/contracts/openapi.root.yaml`'s
                        own description of `Order.taxSummary`) — the full per-line/per-rate/
                        shipping breakdown lives on the downloadable invoice PDF instead.
                    -->
                    <div v-if="currentOrder?.taxSummary?.length" data-test="order-tax-summary">
                        <h3 class="m-0 text-base font-semibold">
                            {{ t('order-target-page.label-vat-summary') }}
                        </h3>
                        <div class="mt-3 grid gap-2">
                            <div
                                v-for="row in currentOrder.taxSummary"
                                :key="'tax-rate-' + row.rate"
                                class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-on-surface/10 bg-on-surface/3 p-3"
                                data-test="order-tax-row"
                            >
                                <v-chip size="small" variant="tonal" color="tertiary">
                                    {{ formatPercent(row.rate) }}
                                </v-chip>
                                <span class="opacity-75">{{
                                    t('order-target-page.label-vat-net')
                                }}</span>
                                <strong data-test="order-tax-row-net">{{
                                    formatCurrency(row.netAmount, orderCurrency)
                                }}</strong>
                                <span class="opacity-75">{{
                                    t('order-target-page.label-vat-tax')
                                }}</span>
                                <strong data-test="order-tax-row-tax">{{
                                    formatCurrency(row.taxAmount, orderCurrency)
                                }}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-3 px-1 text-sm">
                                <span class="opacity-75">{{
                                    t('order-target-page.label-net-total')
                                }}</span>
                                <strong>{{
                                    formatCurrency(currentOrder.netTotal, orderCurrency)
                                }}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-3 px-1 text-sm">
                                <span class="opacity-75">{{
                                    t('order-target-page.label-tax-total')
                                }}</span>
                                <strong>{{
                                    formatCurrency(currentOrder.taxTotal, orderCurrency)
                                }}</strong>
                            </div>
                        </div>
                    </div>
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentOrder && session.can('update', 'Cart')"
                    color="primary"
                    variant="tonal"
                    data-test="order-reorder"
                    :disabled="loading || reorderLoading"
                    @click="handleReorder"
                >
                    <ShoppingCart :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-reorder') }}
                </v-btn>
                <InlineErrorAlert
                    :message="reorderError"
                    class="w-full"
                    data-test="order-reorder-error"
                />
                <v-btn
                    v-if="cancellable"
                    color="error"
                    variant="tonal"
                    data-test="order-cancel"
                    :disabled="loading"
                    @click="handleCancel"
                >
                    {{ t('order-target-page.button-cancel') }}
                </v-btn>
                <InlineErrorAlert
                    :message="cancelError"
                    class="w-full"
                    data-test="order-cancel-error"
                />
                <v-btn
                    v-if="currentOrder && session.can('update', 'Order')"
                    color="secondary"
                    data-test="go-to-edit"
                    :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                >
                    {{ t('order-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="invoiceAvailable"
                    variant="tonal"
                    color="tertiary"
                    data-test="order-download-invoice"
                    :disabled="loading || invoiceLoading"
                    :loading="invoiceLoading"
                    @click="downloadInvoice"
                >
                    <Download :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-download-invoice') }}
                </v-btn>
                <v-btn
                    v-if="invoiceAvailable"
                    variant="tonal"
                    color="tertiary"
                    data-test="order-view-invoice"
                    :disabled="loading || invoiceLoading"
                    :loading="invoiceLoading"
                    @click="viewInvoice"
                >
                    <Eye :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-view-invoice') }}
                </v-btn>
                <InlineErrorAlert
                    :message="invoiceError"
                    class="w-full"
                    data-test="order-invoice-error"
                />
                <ul
                    v-if="creditNotes.length > 0"
                    class="w-full flex flex-col gap-2"
                    data-test="order-credit-notes"
                >
                    <li
                        v-for="note in creditNotes"
                        :key="note.id"
                        class="flex flex-wrap items-center gap-2"
                        data-test="order-credit-note-row"
                    >
                        <span class="text-sm">
                            {{
                                t('order-target-page.label-credit-note', {
                                    number: note.number,
                                    date: formatDate(note.issuedAt),
                                    amount: formatCurrency(note.grandTotal, note.currency)
                                })
                            }}
                        </span>
                        <v-btn
                            variant="tonal"
                            color="tertiary"
                            data-test="order-download-credit-note"
                            :disabled="loading || creditNoteLoadingId !== undefined"
                            :loading="creditNoteLoadingId === note.id"
                            @click="downloadCreditNote(note)"
                        >
                            <Download :size="16" class="mr-1" aria-hidden="true" />
                            {{ t('order-target-page.button-download-credit-note') }}
                        </v-btn>
                    </li>
                </ul>
                <InlineErrorAlert
                    :message="creditNoteError"
                    class="w-full"
                    data-test="order-credit-note-error"
                />
                <span
                    v-if="currentOrder"
                    class="self-center text-sm opacity-75"
                    data-test="order-number"
                >
                    {{
                        t('order-target-page.label-order-number', {
                            number: currentOrder.orderNumber
                        })
                    }}
                </span>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'OrdersList' })">
                    {{ t('order-target-page.button-go-to-list') }}
                </v-btn>
                <v-btn
                    v-if="auditLogTo && session.can('read', 'AuditLog')"
                    variant="tonal"
                    data-test="order-history"
                    :to="routerLinkI18n(auditLogTo)"
                >
                    {{ t('order-target-page.button-history') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
