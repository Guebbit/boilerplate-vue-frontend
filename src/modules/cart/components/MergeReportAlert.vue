<script setup lang="ts">
/**
 * @module
 * The cart page's merge alert: after a guest cart is merged into the account's, one inline,
 * closable alert lists the lines that need a look: quantities that are not what the guest chose,
 * lines the stock does not cover, and products that could not be added. Each names the product,
 * the quantity asked for and the quantity the cart holds now; a short line is marked and told to
 * be lowered before checkout, and never says how many are for sale (the server does not tell).
 * Reads the cart store's `mergeReport` and renders nothing while it is empty. Not a toast and not
 * a bell notification: it belongs to this screen and goes when the shopper closes it. See
 * `docs/modules/cart.md`.
 */
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductLines } from '@/modules/products';
import type { MergeLineReason } from '@types';
import { mergeReportKind } from '../domain';
import { useCartStore } from '../store';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The cart store: the report to show, and the way to close it.
 */
const cartStore = useCartStore();

/**
 * The lines the last merge changed, reactive.
 */
const { mergeReport } = storeToRefs(cartStore);

/**
 * The existing product join. A product the merge could not take at all is not in the cart, so
 * the cart page's own read does not cover it; this component reads what its lines need.
 */
const { loadProducts, productOf } = useProductLines();

/**
 * Each reason's sentence, as a literal key so a translation check can see every one.
 */
const REASON_KEYS: Record<MergeLineReason, string> = {
    summed: 'cart-page.merge-reason-summed',
    capped: 'cart-page.merge-reason-capped',
    unavailable: 'cart-page.merge-reason-unavailable'
};

/**
 * A product's title in the language on screen, or a generic label when it cannot be read (it left
 * the catalogue, or the read has not answered).
 *
 * @param productId - The line's product id.
 * @returns The text to print for the product.
 */
const titleOf = (productId: string): string =>
    productOf(productId)?.title ?? t('cart-page.merge-alert-unknown-product');

// Vue `watch`: a new report replaces the old one wholesale, so the source changing is "a merge
// answered". `immediate` covers a report that already exists when the page opens.
// https://vuejs.org/api/reactivity-core.html#watch
watch(
    mergeReport,
    (lines) => {
        // A failed read is not an error to show: the lines then wear the generic label.
        loadProducts(lines.map(({ productId }) => productId)).catch(() => undefined);
    },
    { immediate: true }
);
</script>

<template>
    <!--
        ONE live region for the whole alert (`role="status"`, polite): a row of its own would have
        a screen reader announce the same merge once per line. Vuetify's alert defaults to the
        assertive `alert` role, which is too loud for news the shopper did not ask to be
        interrupted for.
    -->
    <v-alert
        v-if="mergeReport.length > 0"
        type="info"
        variant="tonal"
        closable
        role="status"
        :title="t('cart-page.merge-alert-title')"
        :close-label="t('cart-page.merge-alert-dismiss')"
        data-test="cart-merge-report"
        @click:close="cartStore.dismissMergeReport()"
    >
        <p>{{ t('cart-page.merge-alert-intro') }}</p>
        <ul class="mt-2 flex flex-col gap-1">
            <li
                v-for="line in mergeReport"
                :key="line.productId"
                :data-reason="line.reason"
                :data-kind="mergeReportKind(line)"
                data-test="cart-merge-report-line"
            >
                {{
                    t('cart-page.merge-alert-line', {
                        title: titleOf(line.productId),
                        requested: line.requested,
                        resulting: line.resulting
                    })
                }}
                <template v-if="line.reason">{{ t(REASON_KEYS[line.reason]) }}</template>
                <!--
                    The marker is text, not colour alone, and sits inside the alert's one live
                    region: no role of its own, so the alert still announces once.
                -->
                <template v-if="mergeReportKind(line) === 'short'">
                    <v-chip
                        size="small"
                        color="warning"
                        variant="tonal"
                        label
                        data-test="cart-merge-report-short"
                    >
                        {{ t('cart-page.stock-short-marker') }}
                    </v-chip>
                    {{ t('cart-page.merge-short-advice') }}
                </template>
            </li>
        </ul>
    </v-alert>
</template>
