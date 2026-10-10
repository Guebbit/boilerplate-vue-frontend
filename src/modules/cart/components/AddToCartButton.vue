<script setup lang="ts">
/**
 * @module
 * The product page's "add to cart" button, contributed to the `product-actions` slot by this
 * module's manifest — the products module owns the page and never imports the cart. Signed in it
 * writes to the server's cart; as a guest, to the list in the browser. A failure blocks this one
 * action in place (`InlineErrorAlert`) rather than raising a toast.
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
import { shelfStateOf } from '@/modules/products';
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
 * Whether a visitor is signed in: a signed-in visitor's cart is on the server, a guest's is a list
 * in their own browser.
 */
const session = useSessionStore();

/** The visitor's standing, reactive. */
const { isAuth } = storeToRefs(session);

/**
 * Whether the session's keys let it shop at all. Staff and administrators hold none, so for
 * them the button is not offered rather than offered and refused. A guest is not asked: they
 * shop into the cart in their browser.
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
 * The shelf as the shopper reads it, from the flags every reader gets (`purchasable`, `inStock`;
 * the exact counters are for stock readers only). Off sale and sold out both hold the button back.
 */
const shelf = computed(() => shelfStateOf(product));

/**
 * The label the button wears: the action, or why it is not on offer.
 */
const label = computed(() => {
    if (shelf.value === 'off-sale') return t('add-to-cart-button.off-sale');
    return shelf.value === 'out-of-stock'
        ? t('add-to-cart-button.out-of-stock')
        : t('add-to-cart-button.label');
});

/**
 * The button's own blocked state — see docs/theory/request-flow.md.
 */
const { message: error, report: reportError, clear: clearError } = useBlockingError();

/**
 * Adds one unit to a guest's own list, kept in their browser. There is nothing to ask a server, so
 * the only way it fails is a list already full of other products.
 */
const addToGuestCart = () => {
    if (cartStore.addGuestItem(product.id, 1)) addMessage(t('add-to-cart-button.success'));
    else reportError(new Error(t('add-to-cart-button.guest-full')));
};

/**
 * Adds one unit to the cart. `POST /cart` is "add": the server grows a line the shopper already
 * has, so no read-then-increment happens here: the quantity added is never computed from a local
 * copy of the cart. A guest's list grows the same way, locally.
 *
 * @returns Nothing; a failure blocks the button in place ({@link error}).
 */
const handleAddToCart = () => {
    clearError();
    if (!isAuth.value) {
        addToGuestCart();
        return;
    }
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
            :disabled="shelf !== 'in-stock' || loading"
            @click="handleAddToCart"
        >
            <ShoppingCart :size="18" class="mr-1" aria-hidden="true" />
            {{ label }}
        </v-btn>
        <InlineErrorAlert :message="error" data-test="add-to-cart-error" />
    </div>
</template>
