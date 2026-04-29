<template>
    <LayoutDefault id="cart-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('cart-page.page-title') }}</span>
            </h1>
        </template>

        <div v-if="cartItems.length === 0" class="theme-card">
            <p>{{ t('cart-page.empty-cart') }}</p>
            <RouterLink
                :to="
                    routerLinkI18n({
                        name: 'ProductsList'
                    })
                "
            >
                {{ t('cart-page.button-go-to-products') }}
            </RouterLink>
        </div>

        <div v-else>
            <div class="cart-items">
                <div
                    v-for="item in cartItems"
                    :key="'cart-item-' + item.productId"
                    class="theme-card cart-item"
                >
                    <div class="card-content">
                        <h3 class="card-title">
                            {{ t('cart-page.label-product-id') }}: <b>{{ item.productId }}</b>
                        </h3>
                        <p>{{ t('cart-page.label-quantity') }}: {{ item.quantity }}</p>
                        <div class="cart-item-actions">
                            <button
                                class="theme-button decrease-button"
                                :disabled="item.quantity <= 1"
                                @click="updateCartItem(item.productId, item.quantity - 1)"
                            >
                                -
                            </button>
                            <button
                                class="theme-button increase-button"
                                @click="updateCartItem(item.productId, item.quantity + 1)"
                            >
                                +
                            </button>
                            <button class="theme-button remove-button" @click="removeCartItem(item.productId)">
                                {{ t('cart-page.button-remove') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="cartSummary" class="theme-card cart-summary">
                <h3>{{ t('cart-page.label-summary') }}</h3>
                <p>{{ t('cart-page.label-items-count') }}: {{ cartSummary.itemsCount }}</p>
                <p>{{ t('cart-page.label-total-quantity') }}: {{ cartSummary.totalQuantity }}</p>
                <p>
                    {{ t('cart-page.label-total') }}: {{ cartSummary.total }}
                    {{ cartSummary.currency }}
                </p>
            </div>

            <div class="cart-actions">
                <button class="theme-button clear-button" @click="clearCart()">
                    {{ t('cart-page.button-clear') }}
                </button>
                <button class="theme-button checkout-button" @click="checkout">
                    {{ t('cart-page.button-checkout') }}
                </button>
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
import { useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useCartStore } from '@/stores/cart.ts';
import { useOrdersStore } from '@/stores/orders.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

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
const { checkout: checkoutOrder } = useOrdersStore();

/**
 * Checkout: place an order from the current cart
 */
const checkout = () =>
    checkoutOrder()
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

<style lang="scss">
#cart-page {
    .cart-items {
        max-width: 800px;
        margin: 0 auto;
    }

    .cart-item {
        margin-bottom: 1rem;

        .cart-item-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
    }

    .cart-summary {
        max-width: 800px;
        margin: 1rem auto;
        padding: 1rem;
    }

    .cart-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1rem;
    }
}
</style>
