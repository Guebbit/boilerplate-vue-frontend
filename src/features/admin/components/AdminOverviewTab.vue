<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AdminHealth, AdminMetricsSummary } from '@types';
import type { IAdminKpiCard } from '@/features/admin/types.ts';
import {
    VAlert,
    VBtn,
    VCard,
    VCardText,
    VChip,
    VCol,
    VProgressCircular,
    VRow
} from 'vuetify/components';

const { t } = useI18n();

const props = defineProps<{
    health?: AdminHealth;
    metrics?: AdminMetricsSummary;
    loading: boolean;
    healthError?: string;
    metricsError?: string;
    onRefresh: () => Promise<void>;
}>();

const loading = computed(() => props.loading);

/*
 * Formats API uptime for compact KPI display.
 */
const formatUptime = (seconds?: number): string => {
    if (seconds === undefined) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/*
 * Formats decimal error rates as percentages.
 */
const formatErrorRate = (rate?: number): string => {
    if (rate === undefined) return '—';
    return `${(rate * 100).toFixed(1)}%`;
};

/*
 * Maps admin health into a visual status.
 */
const healthStatus = computed((): IAdminKpiCard['status'] => {
    if (loading.value) return 'loading';
    if (props.healthError) return 'error';
    if (!props.health) return 'unknown';
    return props.health.status === 'ok' ? 'ok' : 'warn';
});

const databaseStatus = computed((): IAdminKpiCard['status'] => {
    if (!props.health) return 'unknown';
    return props.health.database.status === 'connected' ? 'ok' : 'error';
});

const errorRateStatus = computed((): IAdminKpiCard['status'] => {
    if (!props.metrics) return 'unknown';
    const rate = props.metrics.http.errorRate;
    if (rate > 0.1) return 'error';
    if (rate > 0.02) return 'warn';
    return 'ok';
});

const kpiCards = computed<IAdminKpiCard[]>(() => [
    {
        title: t('admin-page.kpi-api-status'),
        value: props.health?.status ?? '—',
        hint: props.healthError ?? undefined,
        status: healthStatus.value
    },
    {
        title: t('admin-page.kpi-database'),
        value: props.health?.database.status ?? '—',
        status: databaseStatus.value
    },
    {
        title: t('admin-page.kpi-uptime'),
        value: formatUptime(props.health?.uptimeSeconds ?? props.metrics?.process?.uptimeSeconds),
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-requests'),
        value: props.metrics?.http.totalRequests ?? '—',
        hint: props.metricsError ?? undefined,
        status: loading.value ? 'loading' : 'ok'
    },
    {
        title: t('admin-page.kpi-errors'),
        value: props.metrics?.http.totalErrors ?? '—',
        status: errorRateStatus.value
    },
    {
        title: t('admin-page.kpi-error-rate'),
        value: formatErrorRate(props.metrics?.http.errorRate),
        status: errorRateStatus.value
    },
    {
        title: t('admin-page.kpi-latency-p50'),
        value:
            props.metrics?.http.latencyMs.p50 === undefined
                ? '—'
                : `${props.metrics.http.latencyMs.p50} ms`,
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-latency-p95'),
        value:
            props.metrics?.http.latencyMs.p95 === undefined
                ? '—'
                : `${props.metrics.http.latencyMs.p95} ms`,
        status: 'ok'
    }
]);

/*
 * Chooses Material color by KPI status.
 */
const statusColor = (status: IAdminKpiCard['status']) => {
    if (status === 'ok') return 'success';
    if (status === 'warn') return 'warning';
    if (status === 'error') return 'error';
    if (status === 'loading') return 'primary';
    return 'default';
};
</script>

<template>
    <div>
        <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
            <VBtn :disabled="loading" :loading="loading" color="primary" @click="props.onRefresh">
                {{ loading ? t('generic.loading-state') : t('admin-page.button-refresh') }}
            </VBtn>
            <span v-if="props.health?.timestamp" class="text-body-2 text-medium-emphasis">
                {{ t('admin-page.label-last-updated') }}:
                {{ new Date(props.health.timestamp).toLocaleTimeString() }}
            </span>
        </div>

        <VRow class="mb-6" dense>
            <VCol v-for="card in kpiCards" :key="card.title" cols="12" sm="6" lg="3">
                <VCard class="h-100" rounded="lg" variant="outlined">
                    <VCardText>
                        <div class="d-flex align-center justify-space-between mb-3 ga-3">
                            <div class="text-body-2 text-medium-emphasis">{{ card.title }}</div>
                            <VChip :color="statusColor(card.status)" size="small" variant="tonal">
                                {{ card.status }}
                            </VChip>
                        </div>
                        <div class="text-h5 font-weight-bold">{{ card.value }}</div>
                        <div v-if="card.hint" class="text-caption text-error mt-2">
                            {{ card.hint }}
                        </div>
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>

        <VRow dense>
            <VCol v-if="props.metrics?.auth" cols="12" md="6">
                <VCard class="h-100" rounded="lg" variant="outlined">
                    <VCardText>
                        <h3 class="text-h6 mb-4">{{ t('admin-page.section-auth') }}</h3>
                        <VRow dense>
                            <VCol cols="12" sm="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-login-success') }}
                                </div>
                                <div class="text-h6">
                                    {{ props.metrics.auth.loginSuccess ?? 0 }}
                                </div>
                            </VCol>
                            <VCol cols="12" sm="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-login-failure') }}
                                </div>
                                <div class="text-h6 text-warning">
                                    {{ props.metrics.auth.loginFailure ?? 0 }}
                                </div>
                            </VCol>
                            <VCol cols="12" sm="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-signup-success') }}
                                </div>
                                <div class="text-h6">
                                    {{ props.metrics.auth.signupSuccess ?? 0 }}
                                </div>
                            </VCol>
                        </VRow>
                    </VCardText>
                </VCard>
            </VCol>

            <VCol v-if="props.metrics?.business" cols="12" md="6">
                <VCard class="h-100" rounded="lg" variant="outlined">
                    <VCardText>
                        <h3 class="text-h6 mb-4">{{ t('admin-page.section-business') }}</h3>
                        <VRow dense>
                            <VCol cols="12" sm="6">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-orders-created') }}
                                </div>
                                <div class="text-h6">
                                    {{ props.metrics.business.ordersCreated ?? 0 }}
                                </div>
                            </VCol>
                            <VCol cols="12" sm="6">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-checkout-success') }}
                                </div>
                                <div class="text-h6">
                                    {{ props.metrics.business.checkoutSuccess ?? 0 }}
                                </div>
                            </VCol>
                        </VRow>
                    </VCardText>
                </VCard>
            </VCol>

            <VCol v-if="props.health" cols="12">
                <VCard rounded="lg" variant="outlined">
                    <VCardText>
                        <h3 class="text-h6 mb-4">{{ t('admin-page.section-system') }}</h3>
                        <VRow dense>
                            <VCol cols="12" sm="6" md="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-environment') }}
                                </div>
                                <div class="font-weight-medium">{{ props.health.environment }}</div>
                            </VCol>
                            <VCol cols="12" sm="6" md="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-service') }}
                                </div>
                                <div class="font-weight-medium">{{ props.health.service }}</div>
                            </VCol>
                            <VCol cols="12" sm="6" md="4">
                                <div class="text-body-2 text-medium-emphasis">
                                    {{ t('admin-page.label-node-version') }}
                                </div>
                                <div class="font-weight-medium">{{ props.health.nodeVersion }}</div>
                            </VCol>
                            <template v-if="props.health.memory">
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-heap-used') }}
                                    </div>
                                    <div class="font-weight-medium">
                                        {{ props.health.memory.heapUsedMb }} MB
                                    </div>
                                </VCol>
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-heap-total') }}
                                    </div>
                                    <div class="font-weight-medium">
                                        {{ props.health.memory.heapTotalMb }} MB
                                    </div>
                                </VCol>
                            </template>
                            <template v-if="props.health.system">
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-platform') }}
                                    </div>
                                    <div class="font-weight-medium">
                                        {{ props.health.system.platform }}
                                    </div>
                                </VCol>
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-cpu-count') }}
                                    </div>
                                    <div class="font-weight-medium">
                                        {{ props.health.system.cpuCount }}
                                    </div>
                                </VCol>
                            </template>
                            <template v-if="props.health.integrations">
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-loki') }}
                                    </div>
                                    <VChip
                                        :color="
                                            props.health.integrations.loki ? 'success' : 'warning'
                                        "
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ props.health.integrations.loki ? '✓' : '✗' }}
                                    </VChip>
                                </VCol>
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-posthog') }}
                                    </div>
                                    <VChip
                                        :color="
                                            props.health.integrations.posthog
                                                ? 'success'
                                                : 'warning'
                                        "
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ props.health.integrations.posthog ? '✓' : '✗' }}
                                    </VChip>
                                </VCol>
                                <VCol cols="12" sm="6" md="4">
                                    <div class="text-body-2 text-medium-emphasis">
                                        {{ t('admin-page.label-otel') }}
                                    </div>
                                    <VChip
                                        :color="
                                            props.health.integrations.otelEnabled
                                                ? 'success'
                                                : 'warning'
                                        "
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ props.health.integrations.otelEnabled ? '✓' : '✗' }}
                                    </VChip>
                                </VCol>
                            </template>
                        </VRow>
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>

        <VAlert
            v-if="!loading && !props.health && !props.metrics"
            class="mt-6"
            type="info"
            variant="tonal"
        >
            {{ t('generic.no-data') }}
        </VAlert>
        <div v-else-if="loading" class="d-flex justify-center py-6">
            <VProgressCircular color="primary" indeterminate />
        </div>
    </div>
</template>
