<script lang="ts">
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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useOrderActionsRefetch } from '@/modules/orders/composables/use-order-actions-refetch.ts';
import { useCartStore } from '@/modules/cart';
import { useSessionStore } from '@/infrastructure/session.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import {
    Calendar,
    Circle,
    Clock,
    CreditCard,
    Download,
    Euro,
    Eye,
    FileText,
    Hash,
    Mail,
    MapPin,
    ShoppingCart,
    Truck
} from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency,
    formatPercent
} from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { downloadBlob } from '@guebbit/js-toolkit';
import { PaymentPanel, TransferInstructionsPanel } from '@/modules/payments';
import { ShipmentPanel } from '@/modules/delivery';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

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
const { watchOrder, fetchOrder, fetchInvoice, cancelOrder } = useOrdersStore();

/**
 * The session, for the `meta.can` rule that gates the "History" link — a reader who cannot read
 * the audit trail should not see a link that 403s.
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
 * Whether a reorder is in flight (FA39). `reorder` runs under the CART store's `fetchAny`, a
 * different loading flag from {@link loading} above (the orders store's own) — the reorder
 * button has to disable on this one, or a double-click fires the request twice.
 */
const { loading: reorderLoading } = storeToRefs(useCartStore());

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

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
 * Whether the server has actually issued this order's invoice — true once its `pending → paid`
 * transition landed, per the same rule {@link cancellable} follows: read from the server rather
 * than re-derived, so a lifecycle rule that changes there cannot leave this button offering a
 * download the API refuses with 404.
 *
 * @returns `true` once `GET /orders/{id}/invoice` would answer a PDF rather than a 404.
 */
const invoiceAvailable = computed(() => currentOrder.value?.actions?.invoice === true);

/**
 * The order's own frozen currency (FA37) — every price on this page is `currentOrder`'s own money,
 * never the shop's current default. `'EUR'` only stands in for an order that predates this field,
 * per the API's own note on `Order.currency`.
 */
const orderCurrency = computed(() => currentOrder.value?.currency ?? 'EUR');

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
 * Cancels this order after an explicit confirmation.
 *
 * @returns Nothing; success is reported as a toast, a failure blocks the button in place
 *  ({@link cancelError}), and the page re-renders the new status either way.
 */
const handleCancel = () => {
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
};

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
 * the catalogue are skipped server-side, and the cart page shows what actually landed.
 *
 * @returns Nothing; success is reported as a toast and navigates to the cart, a failure blocks
 *  the button in place ({@link reorderError}).
 */
const handleReorder = () => {
    if (!currentOrder.value) return;
    clearReorderError();
    reorder(currentOrder.value.id)
        .then(() => {
            addMessage(t('order-target-page.success-reorder'));
            return router.push(routerLinkI18n({ name: 'Cart' }));
        })
        .catch((error) => reportReorderError(error));
};

/**
 * Hero heading.
 *
 * @returns The loaded order id, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-target-page.page-title'));

/**
 * Hero subheading.
 *
 * @returns The order notes, falling back to the customer email, then to the
 *  empty-value glyph.
 */
const heroDescription = computed(() =>
    formatText(currentOrder.value?.notes || currentOrder.value?.email)
);

/**
 * Localized order status.
 *
 * @returns The translated status label, or the empty-value glyph when the order
 *  carries no status yet.
 */
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
});

/**
 * The frozen shipping address, one line — whoever fulfils the order needs to see it without
 * opening the address book, which may since have changed or lost the entry this order was placed
 * against.
 *
 * @returns The address as one readable line, or `undefined` when the order carries none.
 */
const shippingAddressText = computed(() => {
    const address = currentOrder.value?.shippingAddress;
    if (!address) return undefined;
    return `${address.fullName}, ${address.street}, ${address.zip} ${address.city}, ${address.country}`;
});

/**
 * Whether an invoice request — either action below — is in flight. Its own flag, not the store's
 * shared `loading`, so paging through or cancelling the order doesn't spin this button too.
 */
const invoiceLoading = ref(false);

/**
 * The invoice actions' own blocked state — download and view are the same {@link withInvoice}
 * call rendering the PDF two different ways, so one blocked state covers both buttons.
 */
const {
    message: invoiceError,
    report: reportInvoiceError,
    clear: clearInvoiceError
} = useBlockingError();

/**
 * Renders the invoice once and hands the bytes to `action` — the one request either button below
 * makes.
 *
 * @param action - What to do with the fetched PDF.
 * @returns A promise resolving once `action` ran; a missing route id or an empty response (the
 *  toolkit's `fetchAny` declining to run) is a no-op, and a render failure blocks both invoice
 *  buttons in place ({@link invoiceError}).
 */
const withInvoice = (action: (blob: Blob) => void) => {
    if (!id) return;
    invoiceLoading.value = true;
    clearInvoiceError();
    return fetchInvoice(id)
        .then((blob) => {
            if (blob) action(blob);
        })
        .catch((error: unknown) => reportInvoiceError(error))
        .finally(() => {
            invoiceLoading.value = false;
        });
};

/**
 * Downloads the server-rendered invoice as a PDF file.
 *
 * @returns A promise resolving once the download has been triggered.
 */
const downloadInvoice = () => withInvoice((blob) => downloadBlob(blob, `order-${id}-invoice.pdf`));

/**
 * Opens the server-rendered invoice in a new tab, for a look before deciding whether to keep it.
 * The object URL is revoked once that tab has loaded it, or right away if the popup was blocked.
 *
 * @returns A promise resolving once the tab has been opened.
 */
const viewInvoice = () =>
    withInvoice((blob) => {
        const url = URL.createObjectURL(blob);
        const tab = window.open(url, '_blank');
        if (tab) tab.addEventListener('load', () => URL.revokeObjectURL(url));
        else URL.revokeObjectURL(url);
    });

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
watchOrder(() => id);

/**
 * Forces the one re-fetch a list-cache arrival needs to gain `actions` — see the composable's
 * own docs for why a second forced fetch must not race it.
 */
useOrderActionsRefetch(currentOrder, () => id, fetchOrder);
</script>

<template>
    <LayoutDefault id="order-target" :title="t('order-target-page.page-title')">
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
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('order-target-page.loading') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <!-- The money and the parcel: each panel re-reads the order when its module
                         moves the status, so this page never guesses at either. -->
                    <PaymentPanel
                        v-if="currentOrder"
                        :order-id="currentOrder.id"
                        :order-payable="currentOrder.actions?.pay"
                        :order-status="currentOrder.status"
                        :pay-by="currentOrder.payBy"
                        @paid="fetchOrder(currentOrder.id, { forced: true })"
                    />
                    <TransferInstructionsPanel
                        v-if="currentOrder?.transferInstructions"
                        :instructions="currentOrder.transferInstructions"
                        :pay-by="currentOrder.payBy"
                    />
                    <ShipmentPanel
                        v-if="currentOrder"
                        :order-id="currentOrder.id"
                        :shipping-method-id="currentOrder.shippingMethod"
                        :can-start="currentOrder.actions?.start ?? false"
                        :can-fulfill="currentOrder.actions?.fulfill ?? false"
                        :can-ship="currentOrder.actions?.ship ?? false"
                        :can-deliver="currentOrder.actions?.deliver ?? false"
                        :override="currentOrder.actions?.override ?? []"
                        @moved="fetchOrder(currentOrder.id, { forced: true })"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        v-if="currentOrder?.shippingMethod"
                        :label="t('order-target-page.label-shipping')"
                        :value="`${currentOrder.shippingMethod} — ${formatCurrency(currentOrder.shippingCost ?? 0, orderCurrency)}`"
                        :icon="Truck"
                        data-test="order-shipping"
                    />
                    <ItemDetailField
                        v-if="shippingAddressText"
                        :label="t('order-target-page.label-shipping-address')"
                        :value="shippingAddressText"
                        :icon="MapPin"
                        full-width
                        data-test="order-shipping-address"
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
                                class="rounded-2xl border border-on-surface/10 bg-on-surface/3 p-4"
                            >
                                <div class="flex items-start gap-3">
                                    <!--
                                        The picture is resolved LIVE against the catalogue product
                                        (`item.current`), never frozen — `null` once that product
                                        is hard-deleted, which `LazyImage` already renders as its
                                        own placeholder. See SECURITY_HOLES_7_STORAGE_QUOTA.
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
                                            <v-chip size="small" variant="tonal" color="tertiary">
                                                × {{ item.quantity }}
                                            </v-chip>
                                        </div>
                                        <div class="flex items-center justify-between gap-3">
                                            <p class="m-0 opacity-75">
                                                {{ t('order-target-page.label-product-id') }}
                                            </p>
                                            <strong>{{ item.product.id }}</strong>
                                        </div>
                                        <!-- FA32b: the response already carries the frozen unit
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
                                class="flex items-center justify-between gap-3 rounded-2xl border border-on-surface/10 bg-on-surface/3 p-3"
                            >
                                <v-chip size="small" variant="tonal" color="tertiary">
                                    {{ formatPercent(row.rate) }}
                                </v-chip>
                                <span class="opacity-75">{{
                                    t('order-target-page.label-vat-net')
                                }}</span>
                                <strong>{{ formatCurrency(row.netAmount, orderCurrency) }}</strong>
                                <span class="opacity-75">{{
                                    t('order-target-page.label-vat-tax')
                                }}</span>
                                <strong>{{ formatCurrency(row.taxAmount, orderCurrency) }}</strong>
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
                    v-if="currentOrder"
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
                    v-if="currentOrder"
                    color="secondary"
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
                <span
                    v-if="currentOrder?.orderNumber"
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
                    v-if="currentOrder && session.can('read', 'AuditLog')"
                    variant="tonal"
                    data-test="order-history"
                    :to="routerLinkI18n({ name: 'AuditLog', query: { target: currentOrder.id } })"
                >
                    {{ t('order-target-page.button-history') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
