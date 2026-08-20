<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trash2 } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAdminObservability } from '@/modules/admin/composables/use-admin-observability.ts';
import type { AdminTabKey } from '@/modules/admin/types.ts';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import AdminOverviewTab from '@/modules/admin/components/AdminOverviewTab.vue';
import AdminAuditTab from '@/modules/admin/components/AdminAuditTab.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

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
    fetchAuditLogs,
    clearingExpiredTokens,
    clearExpiredTokens
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
 * Asks first, then purges the expired refresh tokens and says how it went.
 *
 * What is left here is the two things that are this view's: the confirmation, and which words
 * announce the outcome. The call itself and its pending flag belong to
 * {@link useAdminObservability} — see `clearExpiredTokens` there for why that one rejects while
 * the four reads do not.
 *
 * @returns A promise resolving once the toast has been raised, or nothing at all if the visitor
 *  declined the confirmation.
 */
const confirmClearExpiredTokens = () => {
    const shouldContinue = globalThis.confirm(t('admin-page.confirm-clear-expired-tokens'));
    if (!shouldContinue) return;
    return clearExpiredTokens()
        .then(() => addMessage(t('admin-page.success-clear-expired-tokens')))
        .catch(() => addMessage(t('admin-page.error-clear-expired-tokens')));
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
                :loading="clearingExpiredTokens"
                @click="confirmClearExpiredTokens"
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
                    @refresh="fetchAll"
                />
            </v-tabs-window-item>
            <v-tabs-window-item value="audit">
                <AdminAuditTab
                    :audit-events="auditEvents"
                    :total="auditTotal"
                    :loading="loadingAudit"
                    :error="errorAudit"
                    @search="fetchAuditLogs"
                />
            </v-tabs-window-item>
        </v-tabs-window>
    </LayoutDefault>
</template>
