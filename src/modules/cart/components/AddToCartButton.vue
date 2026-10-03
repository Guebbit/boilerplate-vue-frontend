<script setup lang="ts">
/**
 * @module
 * The product page's "add to cart" button, contributed to the `product-actions` slot by this
 * module's manifest — the products module owns the page and never imports the cart. A failure
 * blocks this one action in place (`InlineErrorAlert`) rather than raising a toast.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { ShoppingCart } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { Product } from '@types';
import { useCartStore } from '../store';

/**
 * The product the button adds a unit of.
 */
const { product } = defineProps<{
    product: Product;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast helper for the success message.
 */
const { addMessage } = useNotificationsStore();

/**
 * Whether a visitor is signed in — a guest has no cart to write to.
 */
const session = useSessionStore();

/** The visitor's standing, reactive. */
const { isAuth } = storeToRefs(session);

/**
 * Whether the session's keys let it shop at all. Staff and administrators hold none, so for
 * them the button is not offered rather than offered and refused. A guest is not asked: they
 * keep the disabled button and its sign-in hint.
 */
const mayShop = computed(() => !isAuth.value || session.can('update', 'Cart'));

/**
 * The cart store, and its in-flight flag: the button's own double-click guard. Read off
 * `storeToRefs`, not destructured off the store, so it stays reactive.
 */
const cartStore = useCartStore();

/** The in-flight flag, reactive. */
const { loading } = storeToRefs(cartStore);

/**
 * Whether the shelf holds nothing — the server's `inStock` flag, which every reader gets (the
 * exact counters are for stock readers only).
 */
const outOfStock = computed(() => !product.inStock);

/**
 * The button's own blocked state — see docs/theory/request-flow.md.
 */
const { message: error, report: reportError, clear: clearError } = useBlockingError();

/**
 * Adds one unit to the cart. `POST /cart` is "add": the server grows a line the shopper already
 * has, so no read-then-increment happens here: the quantity added is never computed from a local
 * copy of the cart.
 *
 * @returns Nothing; a failure blocks the button in place ({@link error}).
 */
const handleAddToCart = () => {
    clearError();
    cartStore
        .addCartItem(product.id, 1)
        .then(() => addMessage(t('add-to-cart-button.success')))
        .catch(reportError);
};
</script>

<template>
    <div v-if="mayShop" class="flex flex-col gap-2">
        <v-btn
            color="primary"
            data-test="add-to-cart"
            :disabled="!isAuth || outOfStock || loading"
            @click="handleAddToCart"
        >
            <ShoppingCart :size="18" class="mr-1" aria-hidden="true" />
            {{ outOfStock ? t('add-to-cart-button.out-of-stock') : t('add-to-cart-button.label') }}
        </v-btn>
        <InlineErrorAlert :message="error" data-test="add-to-cart-error" />
    </div>
</template>
