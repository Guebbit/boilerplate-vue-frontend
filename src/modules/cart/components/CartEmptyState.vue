<script setup lang="ts">
/**
 * @module
 * The empty-basket state both carts show: the cart icon, "your cart is empty" and the way to the
 * catalogue. Props-free — the signed-in and the guest cart say the same thing.
 */
import ListEmptyState from '@/ui/molecules/ListEmptyState.vue';
import { useI18n } from 'vue-i18n';
import { ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Translation function.
 */
const { t } = useI18n();
</script>

<template>
    <ListEmptyState :title="t('cart-page.empty-cart')" :icon="ShoppingCart">
        <template #actions>
            <v-btn color="primary" :to="routerLinkI18n({ name: 'ProductsList' })">
                {{ t('cart-page.button-go-to-products') }}
            </v-btn>
        </template>
    </ListEmptyState>
</template>
