<template>
    <LayoutDefault id="order-target">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-target-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <div v-if="currentOrder">
                    <h2>{{ t('order-target-page.label-order-id') }}: {{ currentOrder.id }}</h2>
                    <p>{{ t('order-target-page.label-status') }}: {{ currentOrder.status }}</p>
                    <p>{{ t('order-target-page.label-total') }}: {{ currentOrder.total }}</p>
                    <p v-if="currentOrder.notes">{{ t('order-target-page.label-notes') }}: {{ currentOrder.notes }}</p>
                    <p v-if="currentOrder.createdAt">{{ t('order-target-page.label-date') }}: {{ currentOrder.createdAt }}</p>
                    <div v-if="currentOrder.items.length > 0">
                        <h3>{{ t('order-target-page.label-items') }}</h3>
                        <div
                            v-for="item in currentOrder.items"
                            :key="'order-item-' + item.productId"
                            class="theme-card"
                        >
                            <p>{{ t('order-target-page.label-product-id') }}: {{ item.productId }}</p>
                            <p>{{ t('order-target-page.label-quantity') }}: {{ item.quantity }}</p>
                        </div>
                    </div>
                </div>
                <p v-else>{{ t('order-target-page.loading') }}</p>
            </div>
        </div>

        <RouterLink
            :to="
                routerLinkI18n({
                    name: 'OrdersList'
                })
            "
        >
            {{ t('order-target-page.button-go-to-list') }}
        </RouterLink>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrderTargetPage'
};
</script>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useOrdersStore } from '@/stores/orders.ts';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

/**
 * Generics
 */
const { t } = useI18n();
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Orders store
 */
const { fetchOrder } = useOrdersStore();
const { currentOrder, selectedOrderId } = storeToRefs(useOrdersStore());

/**
 * Get order from API
 */
onBeforeMount(() => {
    if (!id) return;
    // Select the current order id so selectedRecord/currentOrder
    // will be populated when data is available
    selectedOrderId.value = id;
    return fetchOrder(id);
});
</script>
