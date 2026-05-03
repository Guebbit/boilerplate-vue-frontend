<script lang="ts">
export default {
    name: 'AdminPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/admin.scss';
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import AdminKpiCards from '@/views/admin/components/AdminKpiCards.vue';
import AdminTabOverview from '@/views/admin/components/AdminTabOverview.vue';
import AdminTabLogs from '@/views/admin/components/AdminTabLogs.vue';
import AdminTabAudit from '@/views/admin/components/AdminTabAudit.vue';
import AdminTabTraces from '@/views/admin/components/AdminTabTraces.vue';
import AdminTabAnalytics from '@/views/admin/components/AdminTabAnalytics.vue';

import { useProductsStore } from '@/stores/products';
import { useUsersStore } from '@/stores/users';
import { useOrdersStore } from '@/stores/orders';

import type { AdminDashboardTab, IAdminKpi } from '@/types/admin';

const { t } = useI18n();

// ── Stores (read-only: we only fetch counts, no mutations here) ───────────────

const productsStore = useProductsStore();
const usersStore = useUsersStore();
const ordersStore = useOrdersStore();

const { productsList } = storeToRefs(productsStore);
const { usersList } = storeToRefs(usersStore);
const { ordersList } = storeToRefs(ordersStore);

// ── Tab state ─────────────────────────────────────────────────────────────────

const activeTab = ref<AdminDashboardTab>('overview');

const tabs: { key: AdminDashboardTab; label: string }[] = [
    { key: 'overview', label: 'admin-page.tab-overview' },
    { key: 'logs', label: 'admin-page.tab-logs' },
    { key: 'audit', label: 'admin-page.tab-audit' },
    { key: 'traces', label: 'admin-page.tab-traces' },
    { key: 'analytics', label: 'admin-page.tab-analytics' }
];

// ── KPI cards — derived from already-loaded store data ────────────────────────

const kpis = computed<IAdminKpi[]>(() => [
    {
        label: t('admin-page.kpi-total-products'),
        value: productsList.value.length ?? '—',
        accent: 'primary'
    },
    {
        label: t('admin-page.kpi-total-users'),
        value: usersList.value.length ?? '—',
        accent: 'secondary'
    },
    {
        label: t('admin-page.kpi-total-orders'),
        value: ordersList.value.length ?? '—',
        accent: 'tertiary'
    }
]);

// ── Bootstrap: fetch summary counts on mount (best-effort, no error thrown) ──

onMounted(() => {
    productsStore.fetchProducts().catch(() => {});
    usersStore.fetchUsers().catch(() => {});
    ordersStore.fetchOrders().catch(() => {});
});
</script>

<template>
    <LayoutDefault id="admin-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('admin-page.page-title') }}</span>
            </h1>
            <p class="admin-page-subtitle">{{ t('admin-page.page-subtitle') }}</p>
        </template>

        <!-- KPI summary row -->
        <AdminKpiCards :kpis="kpis" class="admin-kpi-row" />

        <!-- Tab bar -->
        <div class="admin-tab-bar" role="tablist">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                role="tab"
                :aria-selected="activeTab === tab.key"
                :class="['admin-tab-button', { active: activeTab === tab.key }]"
                @click="activeTab = tab.key"
            >
                {{ t(tab.label) }}
            </button>
        </div>

        <!-- Tab panels -->
        <div class="admin-tab-panel">
            <AdminTabOverview
                v-if="activeTab === 'overview'"
                :products-count="productsList.length"
                :users-count="usersList.length"
                :orders-count="ordersList.length"
            />
            <!-- Logs: empty state until backend endpoint is wired -->
            <AdminTabLogs v-else-if="activeTab === 'logs'" :entries="[]" />
            <!-- Audit: empty state until backend audit endpoint is wired -->
            <AdminTabAudit v-else-if="activeTab === 'audit'" :events="[]" />
            <!-- Traces: empty state until Tempo / OTLP endpoint is wired -->
            <AdminTabTraces v-else-if="activeTab === 'traces'" :traces="[]" />
            <!-- Analytics: empty state until PostHog / analytics endpoint is wired -->
            <AdminTabAnalytics v-else-if="activeTab === 'analytics'" :series="[]" />
        </div>
    </LayoutDefault>
</template>
