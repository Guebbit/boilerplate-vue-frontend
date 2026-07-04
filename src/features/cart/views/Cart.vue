<template>
    <LayoutDefault id="cart-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('cart-page.page-title') }}</span>
            </h1>
        </template>

        <VCard v-if="cartItems.length === 0" class="mx-auto my-8 pa-6 text-center" max-width="640">
            <VIcon icon="$cart" size="48" color="primary" class="mb-4" />
            <p class="text-body-1 mb-4">{{ t('cart-page.empty-cart') }}</p>
            <VBtn
                :to="
                    routerLinkI18n({
                        name: 'ProductsList'
                    })
                "
                color="primary"
                variant="flat"
            >
                {{ t('cart-page.button-go-to-products') }}
            </VBtn>
        </VCard>

        <VRow v-else justify="center" class="ga-4">
            <VCol cols="12" md="8" class="d-flex flex-column ga-4">
                <VCard
                    v-for="item in cartItems"
                    :key="'cart-item-' + item.productId"
                    class="cart-item"
                    elevation="2"
                >
                    <VCardText>
                        <div class="d-flex flex-column flex-sm-row justify-space-between ga-4">
                            <div>
                                <h3 class="text-h6 mb-2">
                                    {{ t('cart-page.label-product-id') }}:
                                    <b>{{ item.productId }}</b>
                                </h3>
                                <p class="text-body-2 text-medium-emphasis mb-0">
                                    {{ t('cart-page.label-quantity') }}: {{ item.quantity }}
                                </p>
                            </div>
                            <div class="d-flex align-center ga-2 flex-wrap">
                                <VBtn
                                    class="decrease-button"
                                    :disabled="item.quantity <= 1"
                                    icon="$minus"
                                    size="small"
                                    variant="tonal"
                                    :aria-label="t('cart-page.label-quantity')"
                                    @click="updateCartItem(item.productId, item.quantity - 1)"
                                />
                                <VBtn
                                    class="increase-button"
                                    icon="$plus"
                                    size="small"
                                    variant="tonal"
                                    :aria-label="t('cart-page.label-quantity')"
                                    @click="updateCartItem(item.productId, item.quantity + 1)"
                                />
                                <VBtn
                                    class="remove-button"
                                    color="error"
                                    variant="tonal"
                                    prepend-icon="$delete"
                                    @click="removeCartItem(item.productId)"
                                >
                                    {{ t('cart-page.button-remove') }}
                                </VBtn>
                            </div>
                        </div>
                    </VCardText>
                </VCard>
            </VCol>

            <VCol cols="12" md="4">
                <VCard v-if="cartSummary" class="cart-summary" elevation="2">
                    <VCardTitle class="text-h6">
                        {{ t('cart-page.label-summary') }}
                    </VCardTitle>
                    <VDivider />
                    <VList density="comfortable">
                        <VListItem>
                            <VListItemTitle>{{ t('cart-page.label-items-count') }}</VListItemTitle>
                            <template #append>{{ cartSummary.itemsCount }}</template>
                        </VListItem>
                        <VListItem>
                            <VListItemTitle>{{
                                t('cart-page.label-total-quantity')
                            }}</VListItemTitle>
                            <template #append>{{ cartSummary.totalQuantity }}</template>
                        </VListItem>
                        <VListItem>
                            <VListItemTitle>{{ t('cart-page.label-total') }}</VListItemTitle>
                            <template #append>
                                {{ formatCurrency(cartSummary.total, cartSummary.currency) }}
                            </template>
                        </VListItem>
                    </VList>
                </VCard>

                <div class="d-flex flex-column flex-sm-row flex-md-column ga-3 mt-4">
                    <VBtn class="clear-button" variant="tonal" color="error" @click="clearCart()">
                        {{ t('cart-page.button-clear') }}
                    </VBtn>
                    <VBtn class="checkout-button" color="primary" variant="flat" @click="checkout">
                        {{ t('cart-page.button-checkout') }}
                    </VBtn>
                </div>
            </VCol>
        </VRow>
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
import {
    VBtn,
    VCard,
    VCardText,
    VCardTitle,
    VCol,
    VDivider,
    VIcon,
    VList,
    VListItem,
    VListItemTitle,
    VRow
} from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useCartStore } from '@/features/cart/store.ts';
import { useOrdersStore } from '@/features/orders/store.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

/*
 * Generics
 */
const { t } = useI18n();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { formatCurrency } = useItemDetailDisplay();

/*
 * Cart store
 */
const { fetchCart, updateCartItem, removeCartItem, clearCart } = useCartStore();
const { cartItems, cartSummary } = storeToRefs(useCartStore());
const { checkout: checkoutOrder } = useOrdersStore();

/*
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

/*
 * Load cart on mount
 */
onMounted(fetchCart);
</script>
