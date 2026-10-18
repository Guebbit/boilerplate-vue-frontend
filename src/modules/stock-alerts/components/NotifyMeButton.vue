<script setup lang="ts">
/**
 * @module
 * "Notify me", contributed to the `product-actions` slot by this module's manifest: the products
 * module owns the page and the card and never imports it. Shown to a signed-in shopper only where
 * the product cannot be ordered (sold out, or off sale); once asked it reads "you'll be told" with a
 * way back. A failed request blocks this one button in place.
 */
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { Bell } from 'lucide-vue-next';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { Product } from '@types';
import { shelfStateOf } from '@/modules/products';
import { useStockAlertsStore } from '../store';

/**
 * The product the shopper wants to hear about.
 */
const { product } = defineProps<{
    product: Product;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Whether a visitor is signed in: a guest has no account to tell.
 */
const { isAuth } = storeToRefs(useSessionStore());

/**
 * The store, and whether a call is already in flight (the double-click guard).
 */
const alerts = useStockAlertsStore();

/** The in-flight flag, reactive. */
const { loading } = storeToRefs(alerts);

/**
 * The button's own blocked state.
 */
const { message: error, report: reportError, clear: clearError } = useBlockingError();

/**
 * Whether the product cannot be ordered right now, from the flags every reader gets. A product that
 * can be ordered (in stock, a preorder, a backorder) is not offered this button.
 */
const offered = () => {
    const shelf = shelfStateOf(product);
    return shelf === 'out-of-stock' || shelf === 'off-sale';
};

/**
 * Toggles the request: asked becomes cancelled, anything else is asked.
 *
 * @returns Nothing; a failure blocks the button in place ({@link error}).
 */
const handleToggle = () => {
    clearError();
    (alerts.isAsked(product.id) ? alerts.cancel(product.id) : alerts.ask(product.id)).catch(
        reportError
    );
};

// The button needs to know what was already asked; shared, so a grid costs one read.
onMounted(() => {
    if (isAuth.value) void alerts.ensureStockAlerts();
});
</script>

<template>
    <div v-if="isAuth && (offered() || alerts.isAsked(product.id))" class="flex flex-col gap-2">
        <v-btn
            variant="tonal"
            :color="alerts.isAsked(product.id) ? 'secondary' : undefined"
            data-test="notify-me"
            :disabled="loading"
            @click="handleToggle"
        >
            <Bell :size="18" class="mr-1" aria-hidden="true" />
            {{ alerts.isAsked(product.id) ? t('notify-me.button-told') : t('notify-me.button') }}
        </v-btn>
        <InlineErrorAlert :message="error" data-test="notify-me-error" />
    </div>
</template>
