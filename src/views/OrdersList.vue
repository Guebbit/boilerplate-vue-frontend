<template>
    <LayoutDefault id="orders-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('orders-list-page.page-title') }}</span>
            </h1>
        </template>

        <div v-if="ordersList.length === 0" class="theme-card">
            <p>{{ t('orders-list-page.empty-orders') }}</p>
            <RouterLink
                :to="
                    routerLinkI18n({
                        name: 'Cart'
                    })
                "
            >
                {{ t('orders-list-page.button-go-to-cart') }}
            </RouterLink>
        </div>

        <div v-else class="item-list">
            <div
                v-for="order in ordersList"
                :key="'order-card-' + order.id"
                class="item-card theme-card"
                :class="{
                    active: selectedOrderId === order.id
                }"
                @click="selectedOrderId = order.id"
            >
                <div class="card-content">
                    <h2 class="card-title">
                        <b>{{ order.id }}</b>
                    </h2>
                    <p>{{ t('orders-list-page.label-status') }}: {{ order.status }}</p>
                    <p>{{ t('orders-list-page.label-total') }}: {{ order.total }}</p>
                    <p v-if="order.createdAt">{{ t('orders-list-page.label-date') }}: {{ order.createdAt }}</p>
                    <RouterLink
                        :to="
                            routerLinkI18n({
                                name: 'OrderTarget',
                                params: {
                                    id: order.id
                                }
                            })
                        "
                    >
                        {{ t('orders-list-page.button-go-to-details') }}
                    </RouterLink>
                </div>
            </div>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
import { onMounted } from 'vue';
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

/**
 * Orders store
 */
const { fetchOrders } = useOrdersStore();
const { ordersList, selectedOrderId } = storeToRefs(useOrdersStore());

/**
 * Get orders from API
 */
onMounted(fetchOrders);
</script>

<style>
@import '../assets/styles/pages/itemList.scss';
</style>
