<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`.
 */
export default {
    name: 'StockAlertsPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The shopper's open "notify me" requests, in the account: each names its product and can be
 * cancelled. A request is used once, so an answered one is simply gone from the list.
 */
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductLines } from '@/modules/products';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useStockAlertsStore } from '../store.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The requests, and whether a call is in flight.
 */
const { items, loading } = storeToRefs(useStockAlertsStore());

/**
 * The store's two actions this page uses.
 */
const { fetchStockAlerts, cancel } = useStockAlertsStore();

/**
 * The products' titles — the list answers ids only, and the products store holds the records.
 */
const { titleOf, loadProducts } = useProductLines();

/**
 * This page's own blocked state: one cancel failing must not take the list away.
 */
const {
    message: actionError,
    report: reportActionError,
    clear: clearActionError
} = useBlockingError();

/**
 * Cancels one request.
 *
 * @param productId - The product to stop waiting for.
 * @returns Nothing; a failure blocks the list actions in place ({@link actionError}).
 */
const handleCancel = (productId: string) => {
    clearActionError();
    cancel(productId)
        .then(() => addMessage(t('stock-alerts-page.success-cancelled')))
        .catch((error) => reportActionError(error));
};

onMounted(() => {
    void fetchStockAlerts().then((requests) =>
        loadProducts((requests ?? []).map(({ productId }) => productId))
    );
});
</script>

<template>
    <section class="mx-auto max-w-3xl p-4" data-test="stock-alerts-page">
        <h1 class="mb-4 text-2xl font-semibold">{{ t('stock-alerts-page.page-title') }}</h1>
        <InlineErrorAlert :message="actionError" data-test="stock-alerts-error" />
        <p v-if="items.length === 0 && !loading" class="opacity-75" data-test="stock-alerts-empty">
            {{ t('stock-alerts-page.empty') }}
        </p>
        <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
            <li
                v-for="item in items"
                :key="item.productId"
                class="flex items-center justify-between gap-3 rounded-xl border p-3"
                data-test="stock-alert-row"
            >
                <span>{{ titleOf(item.productId) }}</span>
                <v-btn
                    variant="tonal"
                    :disabled="loading"
                    data-test="stock-alert-cancel"
                    @click="handleCancel(item.productId)"
                >
                    {{ t('stock-alerts-page.button-cancel') }}
                </v-btn>
            </li>
        </ul>
    </section>
</template>
