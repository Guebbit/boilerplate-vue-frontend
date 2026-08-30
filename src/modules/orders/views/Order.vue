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
 * `actions`, and mounts the payment/shipment panels as self-contained
 * published-language components.
 */
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useCartStore } from '@/modules/cart';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Download, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency
} from '@/infrastructure/utils/formatters.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { downloadBlob } from '@guebbit/js-toolkit';
import { PaymentPanel } from '@/modules/payments';
import { ShipmentPanel } from '@/modules/delivery';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();
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
const { watchOrder, fetchOrder, downloadInvoice: fetchInvoice, cancelOrder } = useOrdersStore();
const { currentOrder, loading } = storeToRefs(useOrdersStore());
const { reorder } = useCartStore();
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
 * Cancels this order after an explicit confirmation.
 *
 * @returns Nothing; the outcome is reported as a toast and the page re-renders the new status.
 */
const handleCancel = () => {
    const order = currentOrder.value;
    if (!order) return;
    return useDialogStore()
        .confirm({ message: t('order-target-page.confirm-cancel'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return cancelOrder(order.id)
                .then(() => addMessage(t('order-target-page.success-cancel')))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });
};

/**
 * Copies this order's lines back into the cart and goes there — products that have since left
 * the catalogue are skipped server-side, and the cart page shows what actually landed.
 *
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleReorder = () => {
    if (!currentOrder.value) return;
    reorder(currentOrder.value.id)
        .then(() => {
            addMessage(t('order-target-page.success-reorder'));
            return router.push(routerLinkI18n({ name: 'Cart' }));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
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
 * Downloads the server-generated invoice as a PDF file.
 *
 * @returns A promise resolving once the download has been triggered; a missing
 *  route id or empty response is a no-op, and failures surface as a toast.
 */
const downloadInvoice = () => {
    if (!id) return;
    return fetchInvoice(id)
        .then((blob) => {
            if (!blob) return;
            downloadBlob(blob, `order-${id}-invoice.pdf`);
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

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

/*
 * Refreshed once, and only when the record arrived without `actions` — the list-cache path. A
 * cold visit lets `watchOrder`'s own fetch answer with the full detail, and forcing a second
 * fetch beside it would race the toolkit's loading lock (a cancel clicked during that window
 * was silently swallowed — the e2e suite caught it).
 */
let refreshedForActions = false;
watch(
    currentOrder,
    (order) => {
        if (refreshedForActions || !order || order.id !== id || order.actions !== undefined) return;
        refreshedForActions = true;
        void fetchOrder(order.id, { forced: true });
    },
    { immediate: true }
);
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
                    :value="formatCurrency(currentOrder?.totalPrice)"
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
                        icon="#"
                    />
                    <ItemDetailField :label="t('order-target-page.label-status')" icon="●">
                        <v-chip variant="tonal" color="tertiary" class="font-semibold">
                            {{ orderStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('order-target-page.label-total')"
                        :value="formatCurrency(currentOrder.totalPrice)"
                        icon="💶"
                    />
                    <ItemDetailField
                        :label="t('orders-list-page.filter-email')"
                        :value="formatText(currentOrder.email)"
                        icon="✉"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-notes')"
                        :value="formatText(currentOrder.notes)"
                        icon="📝"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('order-target-page.loading') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <!-- The money and the parcel: each panel re-reads the order when its module
                         moves the status, so this page never guesses at either. -->
                    <PaymentPanel
                        v-if="currentOrder"
                        :order-id="currentOrder.id"
                        :order-payable="currentOrder.actions?.pay"
                        @paid="fetchOrder(currentOrder.id, { forced: true })"
                    />
                    <ShipmentPanel
                        v-if="currentOrder"
                        :order-id="currentOrder.id"
                        @advanced="fetchOrder(currentOrder.id, { forced: true })"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        v-if="currentOrder?.shippingMethod"
                        :label="t('order-target-page.label-shipping')"
                        :value="`${currentOrder.shippingMethod} — ${formatCurrency(currentOrder.shippingCost ?? 0)}`"
                        icon="🚚"
                        data-test="order-shipping"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        icon="🕘"
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
                            </article>
                        </div>
                        <p v-else class="m-0 mt-2 opacity-75">{{ t('generic.no-data') }}</p>
                    </div>
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentOrder"
                    color="primary"
                    variant="tonal"
                    data-test="order-reorder"
                    :disabled="loading"
                    @click="handleReorder"
                >
                    <ShoppingCart :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-reorder') }}
                </v-btn>
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
                <v-btn
                    v-if="currentOrder"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                >
                    {{ t('order-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="currentOrder"
                    variant="tonal"
                    color="tertiary"
                    :disabled="loading"
                    @click="downloadInvoice"
                >
                    <Download :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('order-target-page.button-download-invoice') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'OrdersList' })">
                    {{ t('order-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
