<script setup lang="ts">
import '@/styles/features/admin.scss';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAdminObservability } from '@/features/admin/composables/useAdminObservability.ts';
import type { AdminTabKey } from '@/features/admin/types.ts';
import { AuthService } from '@/utils/api.ts';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import AdminOverviewTab from '@/features/admin/components/AdminOverviewTab.vue';
import AdminAuditTab from '@/features/admin/components/AdminAuditTab.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const activeTab = ref<AdminTabKey>('overview');
const cleaningExpiredTokens = ref(false);

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

const clearExpiredTokens = async () => {
    const shouldContinue = globalThis.confirm(t('admin-page.confirm-clear-expired-tokens'));
    if (!shouldContinue) return;
    cleaningExpiredTokens.value = true;
    try {
        await AuthService.deleteExpiredTokens();
        addMessage(t('admin-page.success-clear-expired-tokens'));
    } catch {
        addMessage(t('admin-page.error-clear-expired-tokens'));
    } finally {
        cleaningExpiredTokens.value = false;
    }
};
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
        <div class="admin-maintenance-actions">
            <button
                class="admin-maintenance-button"
                :disabled="cleaningExpiredTokens"
                @click="clearExpiredTokens"
            >
                {{
                    cleaningExpiredTokens
                        ? t('admin-page.button-cleaning-expired-tokens')
                        : t('admin-page.button-clear-expired-tokens')
                }}
            </button>
        </div>

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
