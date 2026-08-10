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
                    <h3 class="text-lg font-semibold">
                        {{ t('cart-page.label-product-id') }}: <b>{{ item.productId }}</b>
                    </h3>
                    <p class="mt-1 opacity-80">
                        {{ t('cart-page.label-quantity') }}: {{ item.quantity }}
                    </p>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-decrease"
                            :disabled="item.quantity <= 1"
                            :aria-label="t('cart-page.button-decrease')"
                            @click="updateCartItem(item.productId, item.quantity - 1)"
                        >
                            <Minus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            icon
                            size="small"
                            variant="tonal"
                            data-test="cart-increase"
                            :aria-label="t('cart-page.button-increase')"
                            @click="updateCartItem(item.productId, item.quantity + 1)"
                        >
                            <Plus :size="16" aria-hidden="true" />
                        </v-btn>
                        <v-btn
                            variant="text"
                            color="error"
                            data-test="cart-remove"
                            @click="removeCartItem(item.productId)"
                        >
                            {{ t('cart-page.button-remove') }}
                        </v-btn>
                    </div>
                </v-card>
            </div>

            <div class="flex flex-col gap-4">
                <v-card v-if="cartSummary" data-test="cart-summary" class="p-5 lg:sticky lg:top-20">
                    <h3 class="text-lg font-semibold">{{ t('cart-page.label-summary') }}</h3>
                    <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
                        <dt class="opacity-70">{{ t('cart-page.label-items-count') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.itemsCount }}</dd>
                        <dt class="opacity-70">{{ t('cart-page.label-total-quantity') }}</dt>
                        <dd class="text-right font-medium">{{ cartSummary.totalQuantity }}</dd>
                    </dl>
                    <v-divider class="my-3" />
                    <div class="flex items-baseline justify-between">
                        <span class="opacity-70">{{ t('cart-page.label-total') }}</span>
                        <span class="text-xl font-bold">
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

<script lang="ts">
export default {
    name: 'CartPage'
};
</script>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Minus, Plus, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useCartStore } from '../store';
import { useCheckoutStore } from '@/features/checkout';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { formatCurrency } from '@/utils/formatters.ts';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

/**
 * Generics
 */
const { t } = useI18n();
const router = useRouter();
const { addMessage } = useNotificationsStore();
/**
 * Cart store
 */
const { fetchCart, updateCartItem, removeCartItem, clearCart } = useCartStore();
const { cartItems, cartSummary } = storeToRefs(useCartStore());
const { checkoutFromCart } = useCheckoutStore();

/**
 * Places an order from the current cart.
 *
 * @returns A promise resolving once the flow settles: a success toast, a cart
 *  reload and a navigation to the orders list, or an error toast.
 */
const checkout = () =>
    checkoutFromCart()
        .then(() => {
            addMessage(t('cart-page.success-checkout'));
            return fetchCart();
        })
        .then(() => {
            router.push(routerLinkI18n({ name: 'OrdersList' }));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Load cart on mount
 */
onMounted(fetchCart);
</script>
