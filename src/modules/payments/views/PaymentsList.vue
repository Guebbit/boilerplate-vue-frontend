<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PaymentsListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The staff payments page: four tabs over what the backend already holds — every payment, the
 * bank transfers still owed, every refund, and what needs a person. The tabs are saved views, not
 * four pages, so a refund opened on the Refunds tab is the same record the drawer opens on All.
 *
 * "Awaiting transfer" reads ORDERS (no payment exists until the money is recorded), so the tab's
 * body is a slot `orders` fills: this module imports no sibling. The RF-reference lookup stays
 * here, its jump to the order is a route name, resolved only when the build ships `orders`.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useSlot } from '@/kernel/slots.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { Order, Payment } from '@types';
import PaymentsTable from '../components/PaymentsTable.vue';
import RefundsTable from '../components/RefundsTable.vue';
import AttentionList from '../components/AttentionList.vue';
import PaymentDrawer from '../components/PaymentDrawer.vue';
import OrderReferenceSearch from '../components/OrderReferenceSearch.vue';

/**
 * The tabs, in the order they show.
 */
type PaymentsTab = 'all' | 'awaiting' | 'refunds' | 'attention';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router and route: the active tab lives in `?tab=` so a link or a reload lands on it.
 */
const router = useRouter();

/**
 * The current route, whose query names the tab.
 */
const route = useRoute();

/**
 * The session, asked whether the viewer may record a payment (the reference lookup's gate).
 */
const session = useSessionStore();

/**
 * What the orders module (or nobody) put in the "Awaiting transfer" tab.
 */
const awaitingContributions = useSlot('payments-awaiting-transfer');

/**
 * The tabs this build offers: "Awaiting transfer" needs a module to read the orders.
 */
const tabs = computed<PaymentsTab[]>(() => [
    'all',
    ...(awaitingContributions.length > 0 ? (['awaiting'] as const) : []),
    'refunds',
    'attention'
]);

/**
 * Reads the tab out of the URL, ignoring one this build does not have.
 *
 * @returns The tab to open on.
 */
const initialTab = (): PaymentsTab => {
    const requested = route.query.tab;
    return tabs.value.find((tab) => tab === requested) ?? 'all';
};

/**
 * Which tab is showing.
 */
const activeTab = ref<PaymentsTab>(initialTab());

/**
 * Switches tab and records it in the URL, replacing history so a tab click is not a back-button
 * stop of its own.
 *
 * @param tab - The tab chosen.
 */
const selectTab = (tab: PaymentsTab) => {
    activeTab.value = tab;
    void router.replace({ query: { ...route.query, tab: tab === 'all' ? undefined : tab } });
};

/**
 * The payment whose drawer is open.
 */
const picked = ref<Payment>();

/**
 * Whether the drawer is open.
 */
const drawerOpen = ref(false);

/**
 * Opens the drawer on a payment.
 *
 * @param payment - The row the visitor picked.
 */
const openDrawer = (payment: Payment) => {
    picked.value = payment;
    drawerOpen.value = true;
};

/**
 * Bumped when the drawer changed money, so the list below remounts and reads again.
 */
const reloadKey = ref(0);

/**
 * `OrderReferenceSearch`'s `@found` handler: the order's edit page, where the offline form lives.
 * `payments` names no order route, so this resolves it by name and does nothing when absent.
 *
 * @param order - The order the reference matched.
 * @returns A promise settling once navigation finished.
 */
const handleReferenceFound = (order: Order) => {
    const target = linkIfRouted(router, 'OrderEdit', { id: order.id });
    return target ? router.push(routerLinkI18n(target)) : Promise.resolve();
};
</script>

<template>
    <div id="payments-list-page">
        <OrderReferenceSearch
            v-if="session.can('create', 'Payment')"
            @found="handleReferenceFound"
        />

        <v-tabs
            :model-value="activeTab"
            color="primary"
            class="mb-4"
            @update:model-value="(tab) => selectTab(tab as PaymentsTab)"
        >
            <v-tab v-for="tab in tabs" :key="tab" :value="tab" :data-test="`payments-tab-${tab}`">
                {{ t(`payments-list-page.tab-${tab}`) }}
            </v-tab>
        </v-tabs>

        <v-tabs-window :model-value="activeTab">
            <v-tabs-window-item value="all">
                <PaymentsTable :key="reloadKey" @select="openDrawer" />
            </v-tabs-window-item>
            <v-tabs-window-item v-if="awaitingContributions.length > 0" value="awaiting">
                <component
                    :is="contribution"
                    v-for="(contribution, index) in awaitingContributions"
                    :key="index"
                />
            </v-tabs-window-item>
            <v-tabs-window-item value="refunds">
                <RefundsTable :key="reloadKey" />
            </v-tabs-window-item>
            <v-tabs-window-item value="attention">
                <AttentionList :key="reloadKey" />
            </v-tabs-window-item>
        </v-tabs-window>

        <PaymentDrawer v-model="drawerOpen" :payment="picked" @changed="reloadKey += 1" />
    </div>
</template>
