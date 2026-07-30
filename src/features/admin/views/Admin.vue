<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trash2 } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAdminObservability } from '@/features/admin/composables/useAdminObservability.ts';
import type { AdminTabKey } from '@/features/admin/types.ts';
import { deleteExpiredTokens } from '@api';

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

/**
 * Whether the overview tab is still loading.
 *
 * @returns `true` while either the health or the metrics call is in flight.
 */
const overviewLoading = computed(() => loadingHealth.value || loadingMetrics.value);

onMounted(() => {
    void fetchAll();
});

/**
 * Purges expired refresh tokens after an explicit confirmation.
 *
 * @returns A promise resolving once the call has settled; the outcome is
 *  reported as a toast, and the button's pending flag is always cleared.
 */
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
    <LayoutDefault id="admin-page" :title="t('admin-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <v-tabs v-model="activeTab" color="primary">
                <v-tab value="overview">{{ t('admin-page.tab-overview') }}</v-tab>
                <v-tab value="audit">{{ t('admin-page.tab-audit') }}</v-tab>
            </v-tabs>
            <v-spacer />
            <v-btn
                variant="tonal"
                color="error"
                :loading="cleaningExpiredTokens"
                @click="clearExpiredTokens"
            >
                <Trash2 :size="16" class="mr-1" aria-hidden="true" />
                {{ t('admin-page.button-clear-expired-tokens') }}
            </v-btn>
        </div>

        <v-tabs-window v-model="activeTab">
            <v-tabs-window-item value="overview">
                <AdminOverviewTab
                    :health="health"
                    :metrics="metrics"
                    :loading="overviewLoading"
                    :health-error="errorHealth"
                    :metrics-error="errorMetrics"
                    :on-refresh="fetchAll"
                />
            </v-tabs-window-item>
            <v-tabs-window-item value="audit">
                <AdminAuditTab
                    :audit-events="auditEvents"
                    :total="auditTotal"
                    :loading="loadingAudit"
                    :error="errorAudit"
                    :on-search="fetchAuditLogs"
                />
            </v-tabs-window-item>
        </v-tabs-window>
    </LayoutDefault>
</template>
