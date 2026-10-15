<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PreordersBoardPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The staff preorder board: two tabs over what the backend already holds. "Products" is the
 * allowance and the units by state per product; "Fulfillment orders" is one row per fulfillment
 * order with its buyer and dates, and carries the Late and Due-soon filters. The tab lives in
 * `?tab=` and the product the second tab is narrowed to in `?productId=`, so a link or a reload
 * lands on the same view. The first tab reads stock, so it is offered only to a holder of
 * `read:StockLevel`; the page itself needs only `display:Order`.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/infrastructure/session.ts';
import { PreorderFulfillmentTable } from '@/modules/delivery';
import PreorderProductsTable from '../components/PreorderProductsTable.vue';

/**
 * The tabs, in the order they show.
 */
type BoardTab = 'products' | 'orders';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router and route: the tab and the product filter live in the query.
 */
const router = useRouter();

/**
 * The current route, whose query names the tab and the product.
 */
const route = useRoute();

/**
 * The session, asked whether the viewer reads stock.
 */
const session = useSessionStore();

/**
 * The tabs this viewer has.
 */
const tabs = computed<BoardTab[]>(() =>
    session.can('read', 'StockLevel') ? ['products', 'orders'] : ['orders']
);

/**
 * The tab a visitor lands on without asking: the products tab when they have it, else the orders.
 */
const firstTab = computed<BoardTab>(() =>
    tabs.value.includes('products') ? 'products' : 'orders'
);

/**
 * Reads the tab out of the URL, ignoring one this viewer does not have.
 *
 * @returns The tab to open on.
 */
const initialTab = (): BoardTab => {
    const requested = route.query.tab;
    return tabs.value.find((tab) => tab === requested) ?? firstTab.value;
};

/**
 * Which tab is showing.
 */
const activeTab = ref<BoardTab>(initialTab());

/**
 * The product the second tab is narrowed to, and a name for it when a click named one.
 */
const productId = ref<string | undefined>(
    typeof route.query.productId === 'string' ? route.query.productId : undefined
);

/**
 * The name of {@link productId}, known only when the products tab supplied it.
 */
const productLabel = ref<string>();

/**
 * Writes the tab and the product filter into the URL, replacing history so neither is a
 * back-button stop of its own.
 */
const syncUrl = () =>
    router.replace({
        query: {
            ...route.query,
            tab: activeTab.value === firstTab.value ? undefined : activeTab.value,
            productId: productId.value
        }
    });

/**
 * Switches tab.
 *
 * @param tab - The tab chosen.
 */
const selectTab = (tab: BoardTab) => {
    activeTab.value = tab;
    void syncUrl();
};

/**
 * The products tab's "fulfillment orders" button: opens the second tab on that product.
 *
 * @param id - The product.
 * @param title - Its name, for the filter chip.
 */
const showOrders = (id: string, title: string) => {
    productId.value = id;
    productLabel.value = title;
    selectTab('orders');
};

/**
 * Drops the product filter.
 */
const clearProduct = () => {
    productId.value = undefined;
    productLabel.value = undefined;
    void syncUrl();
};
</script>

<template>
    <div id="preorders-board-page">
        <v-tabs
            :model-value="activeTab"
            color="primary"
            class="mb-4"
            @update:model-value="(tab) => selectTab(tab as BoardTab)"
        >
            <v-tab v-for="tab in tabs" :key="tab" :value="tab" :data-test="`preorders-tab-${tab}`">
                {{ t(`preorders-page.tab-${tab}`) }}
            </v-tab>
        </v-tabs>

        <v-tabs-window :model-value="activeTab">
            <v-tabs-window-item v-if="tabs.includes('products')" value="products">
                <PreorderProductsTable @show-orders="showOrders" />
            </v-tabs-window-item>
            <v-tabs-window-item value="orders">
                <PreorderFulfillmentTable
                    :product-id="productId"
                    :product-label="productLabel"
                    @clear-product="clearProduct"
                />
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>
