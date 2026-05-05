<script lang="ts">
export default { name: 'AdminPage' };
</script>

<script setup lang="ts">
import '@/styles/pages/admin.scss';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminObservability } from '@/composables/useAdminObservability.ts';
import type { AdminTabKey } from '@/types/admin.ts';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab.vue';
import AdminAuditTab from '@/components/admin/AdminAuditTab.vue';

const { t } = useI18n();

const activeTab = ref<AdminTabKey>('overview');

const {
    health,
    metrics,
    auditEvents,
    auditTotal,
    loadingHealth,
    loadingMetrics,
    loadingAudit,
    errorHealth,
    errorMetrics,
    errorAudit,
    fetchAll,
    fetchAuditLogs
} = useAdminObservability();

const overviewLoading = computed(() => loadingHealth.value || loadingMetrics.value);

onMounted(() => {
    void fetchAll();
});
</script>

<template>
    <LayoutDefault id="admin-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('admin-page.page-title') }}</span>
            </h1>
        </template>

        <nav class="admin-tabs">
            <button
                class="admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === 'overview' }"
                @click="activeTab = 'overview'"
            >
                {{ t('admin-page.tab-overview') }}
            </button>
            <button
                class="admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === 'audit' }"
                @click="activeTab = 'audit'"
            >
                {{ t('admin-page.tab-audit') }}
            </button>
        </nav>

        <div class="admin-tab-content">
            <AdminOverviewTab
                v-if="activeTab === 'overview'"
                :health="health"
                :metrics="metrics"
                :loading="overviewLoading"
                :health-error="errorHealth"
                :metrics-error="errorMetrics"
                :on-refresh="fetchAll"
            />
            <AdminAuditTab
                v-else
                :audit-events="auditEvents"
                :total="auditTotal"
                :loading="loadingAudit"
                :error="errorAudit"
                :on-search="fetchAuditLogs"
            />
        </div>
    </LayoutDefault>
</template>
