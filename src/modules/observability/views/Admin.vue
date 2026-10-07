<script setup lang="ts">
/**
 * @module
 * Admin dashboard shell. Owns the active-tab state and wires {@link useAdminObservability}'s
 * shared state and fetchers down to the overview/audit tabs as props and emit handlers; the tabs
 * themselves render declaratively off what this view feeds them.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminObservability } from '../composables/use-admin-observability.ts';
import type { AdminTabKey } from '../types.ts';

import AdminOverviewTab from '../components/AdminOverviewTab.vue';
import AdminAuditTab from '../components/AdminAuditTab.vue';

/**
 * i18n translator for this view's template and messages.
 */
const { t } = useI18n();

/**
 * Which tab — overview or audit — is currently shown.
 */
const activeTab = ref<AdminTabKey>('overview');

/**
 * Shared observability state and fetchers, handed down to the overview tab — the audit tab reads
 * and fetches for itself, see {@link AdminAuditTab}.
 */
const { health, metrics, loadingHealth, loadingMetrics, errorHealth, errorMetrics, fetchAll } =
    useAdminObservability();

/**
 * Whether the overview tab is still loading.
 *
 * @returns `true` while either the health or the metrics call is in flight.
 */
const overviewLoading = computed(() => loadingHealth.value || loadingMetrics.value);

onMounted(() => {
    void fetchAll();
});
</script>

<template>
    <div id="admin-page">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <v-tabs v-model="activeTab" color="primary">
                <v-tab value="overview" data-test="admin-tab-overview">{{
                    t('admin-page.tab-overview')
                }}</v-tab>
                <v-tab value="audit" data-test="admin-tab-audit">{{
                    t('admin-page.tab-audit')
                }}</v-tab>
            </v-tabs>
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
                <AdminAuditTab endpoint="platform" />
            </v-tabs-window-item>
        </v-tabs-window>
    </div>
</template>
