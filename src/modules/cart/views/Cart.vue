<script lang="ts">
export default {
    name: 'CartPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Cart page. Renders the store's lines and summary, and layers a debounced local
 * stepper (`useLineQuantity`) on top of the store's own quantity update so rapid
 * clicks collapse into one request per line.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useCartStore } from '@/modules/cart/store.ts';
// The stepper's floor is a rule, not a template detail — see `../domain/quantity.ts`. The
// clamping half of that rule moved with the stepping itself, into `use-line-quantity.ts`.
import { MIN_LINE_QUANTITY } from '@/modules/cart/domain';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { useLineQuantity } from '@/modules/cart/composables/use-line-quantity.ts';
import type { CartItem } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { ShippingSelector } from '@/modules/delivery';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router, for the post-checkout navigation to the orders list.
 */
const router = useRouter();

/**
 * Toast notifications.
 */
const { addMessage } = useNotificationsStore();

/**
 * Cart store actions this page drives directly.
 */
const {
    fetchCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    checkout: placeOrder,
    titleOf,
    resolveTitles
} = useCartStore();

/**
 * Cart store state, reactive.
 */
const { cartItems, cartSummary } = storeToRefs(useCartStore());

/**
 * The chosen shipping method — optional, exactly as the API treats it.
 */
const shippingMethodId = ref<string | undefined>();

/**
 * Places an order from the current cart.
 *
 * The store empties the local cart on success, so this only has to say so and move on — no
 * reload, and no reaching into another module's store for an endpoint that is this one's.
 *
 * @returns A promise resolving once the flow settles: a success toast and a navigation to the
 *  orders list, or an error toast.
 */
const checkout = () =>
    placeOrder(
        shippingMethodId.value === undefined
            ? undefined
            : { shippingMethodId: shippingMethodId.value }
    )
        .then(() => {
            addMessage(t('cart-page.success-checkout'));
            // Fire-and-forget: a NavigationFailure here must not convert a completed checkout into an error toast.
            void router.push(routerLinkI18n({ name: 'OrdersList' }));
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Stepping a line's quantity, debounced per product so three quick clicks are one request for the
 * number the visitor stopped on — rather than three racing requests whose last answer wins. The
 * reason that mattered, and why the delay is invisible, is in the composable.
 */
const { quantityOf, stepQuantity, forget, flushPending } = useLineQuantity(
    updateCartItem,
    (error: unknown) => notifyErrorMessages(addMessage, error)
);

/**
 * @param item - The cart line.
 * @returns The quantity the line should show — the visitor's own pending step while one is
 *  outstanding, the store's number the rest of the time.
 */
const lineQuantity = (item: CartItem) => quantityOf(item.productId, item.quantity);

/**
 * Removes a line, forgetting any step still queued for it first: a pending quantity for a line
 * that no longer exists would fire after the removal and put the line back.
 *
 * @param productId - The line to remove.
 * @returns A promise resolving once the removal settles; failure is reported as a toast.
 */
const removeLine = (productId: string) => {
    forget(productId);
    return removeCartItem(productId).catch((error: unknown) =>
        notifyErrorMessages(addMessage, error)
    );
};

onBeforeUnmount(flushPending);

/**
 * Load cart on mount
 */
onMounted(() =>
    fetchCart().then((cart) => resolveTitles((cart?.items ?? []).map(({ productId }) => productId)))
);
</script>

<template>
    <LayoutDefault id="cart-page" :title="t('cart-page.page-title')">
        <v-empty-state v-if="cartItems.length === 0" :title="t('cart-page.empty-cart')">
            <template #media>
                <ShoppingCart :size="64" class="text-secondary" aria-hidden="true" />
            </template>
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('cart-page.button-go-to-products') }}
                </v-btn>
            </template>
        </v-empty-state>

        <div v-else class="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div class="flex flex-col gap-4">
                <v-card
                    v-for="item in cartItems"
                    :key="'cart-item-' + item.productId"
                    data-test="cart-item"
                    class="p-5"
                >
                    <h2 class="text-lg font-semibold">
                        <b>{{ titleOf(item.productId) }}</b>
                    </h2>
                    <!-- A status: the steppers below change it, and a reader should hear the new number. -->
                    <p class="mt-1 opacity-80" role="status">
                        {{ t('cart-page.label-quantity') }}: {{ lineQuantity(item) }}
                    </p>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-decrease"
                            :disabled="lineQuantity(item) <= MIN_LINE_QUANTITY"
                            :aria-label="
                                t('cart-page.button-decrease-named', {
                                    id: titleOf(item.productId)
                                })
                            "
                            @click="stepQuantity(item.productId, item.quantity, -1)"
                        >
                            <Minus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-increase"
                            :aria-label="
                                t('cart-page.button-increase-named', {
                                    id: titleOf(item.productId)
                                })
                            "
                            @click="stepQuantity(item.productId, item.quantity, 1)"
                        >
                            <Plus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            data-test="cart-remove"
                            :aria-label="
                                t('cart-page.button-remove-named', { id: titleOf(item.productId) })
                            "
                            @click="removeLine(item.productId)"
                        >
                            {{ t('cart-page.button-remove') }}
                        </v-btn>
                    </div>
                </v-card>
            </div>

            <div class="flex flex-col gap-4">
                <v-card v-if="cartSummary" data-test="cart-summary" class="p-5 lg:sticky lg:top-20">
                    <h2 class="text-lg font-semibold">{{ t('cart-page.label-summary') }}</h2>
                    <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-count') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.itemsCount }}</dd>
                        <dt class="opacity-70">{{ t('cart-page.label-total-quantity') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.totalQuantity }}</dd>
                    </dl>
                    <v-divider class="my-3" />
                    <ShippingSelector v-model="shippingMethodId" :items-total="cartSummary.total" />
                    <v-divider class="my-3" />
                    <div class="flex items-baseline justify-between">
                        <span class="opacity-70">{{ t('cart-page.label-total') }}</span>
                        <span class="text-xl font-bold" role="status">
                            {{ formatCurrency(cartSummary.total, cartSummary.currency) }}
                        </span>
                    </div>
                    <v-btn
                        color="primary"
                        size="large"
                        block
                        class="mt-4"
                        data-test="cart-checkout"
                        @click="checkout"
                    >
                        {{ t('cart-page.button-checkout') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        block
                        class="mt-2"
                        data-test="cart-clear"
                        @click="clearCart()"
                    >
                        {{ t('cart-page.button-clear') }}
                    </v-btn>
                </v-card>
            </div>
        </div>
    </LayoutDefault>
</template>
