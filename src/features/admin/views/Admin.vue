<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAdminObservability } from '@/features/admin/composables/useAdminObservability.ts';
import type { AdminTabKey } from '@/features/admin/types.ts';
import { deleteExpiredTokens } from '@/utils/api.ts';
import {
    VBtn,
    VCard,
    VCardText,
    VIcon,
    VTab,
    VTabs,
    VWindow,
    VWindowItem
} from 'vuetify/components';

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
        await deleteExpiredTokens();
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
            <h1 class="text-h4 mb-6">
                <span>{{ t('admin-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mb-6" rounded="lg" variant="outlined">
            <VTabs v-model="activeTab" color="primary">
                <VTab value="overview">
                    <VIcon icon="$admin" start />
                    {{ t('admin-page.tab-overview') }}
                </VTab>
                <VTab value="audit">
                    <VIcon icon="$info" start />
                    {{ t('admin-page.tab-audit') }}
                </VTab>
            </VTabs>
            <VCardText class="d-flex justify-end">
                <VBtn
                    color="warning"
                    variant="tonal"
                    :disabled="cleaningExpiredTokens"
                    :loading="cleaningExpiredTokens"
                    @click="clearExpiredTokens"
                >
                    <VIcon icon="$delete" start />
                    {{
                        cleaningExpiredTokens
                            ? t('admin-page.button-cleaning-expired-tokens')
                            : t('admin-page.button-clear-expired-tokens')
                    }}
                </VBtn>
            </VCardText>
        </VCard>

        <VWindow v-model="activeTab">
            <VWindowItem value="overview">
                <AdminOverviewTab
                    :health="health"
                    :metrics="metrics"
                    :loading="overviewLoading"
                    :health-error="errorHealth"
                    :metrics-error="errorMetrics"
                    :on-refresh="fetchAll"
                />
            </VWindowItem>
            <VWindowItem value="audit">
                <AdminAuditTab
                    :audit-events="auditEvents"
                    :total="auditTotal"
                    :loading="loadingAudit"
                    :error="errorAudit"
                    :on-search="fetchAuditLogs"
                />
            </VWindowItem>
        </VWindow>
    </LayoutDefault>
</template>
