<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AdminHealth, AdminMetricsSummary } from '@types';
import type { IAdminKpiCard } from '@/features/admin/types.ts';

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

const formatUptime = (seconds?: number): string => {
    if (seconds === undefined) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatErrorRate = (rate?: number): string => {
    if (rate === undefined) return '—';
    return `${(rate * 100).toFixed(1)}%`;
};

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
</script>

<template>
    <div class="admin-overview-tab">
        <div class="admin-overview-controls">
            <button class="theme-button" :disabled="loading" @click="props.onRefresh">
                {{ loading ? t('generic.loading-state') : t('admin-page.button-refresh') }}
            </button>
            <span v-if="props.health?.timestamp" class="admin-overview-timestamp">
                {{ t('admin-page.label-last-updated') }}:
                {{ new Date(props.health.timestamp).toLocaleTimeString() }}
            </span>
        </div>

        <div class="admin-kpi-grid">
            <div
                v-for="card in kpiCards"
                :key="card.title"
                class="admin-kpi-card"
                :class="`admin-kpi-card-${card.status}`"
            >
                <div class="admin-kpi-title">{{ card.title }}</div>
                <div class="admin-kpi-value">{{ card.value }}</div>
                <div v-if="card.hint" class="admin-kpi-hint">{{ card.hint }}</div>
            </div>
        </div>

        <div v-if="props.metrics?.auth" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-auth') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-login-success')
                    }}</span>
                    <span class="admin-detail-value">{{
                        props.metrics.auth.loginSuccess ?? 0
                    }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-login-failure')
                    }}</span>
                    <span class="admin-detail-value admin-detail-value-warn">{{
                        props.metrics.auth.loginFailure ?? 0
                    }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-signup-success')
                    }}</span>
                    <span class="admin-detail-value">{{
                        props.metrics.auth.signupSuccess ?? 0
                    }}</span>
                </div>
            </div>
        </div>

        <div v-if="props.metrics?.business" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-business') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-orders-created')
                    }}</span>
                    <span class="admin-detail-value">{{
                        props.metrics.business.ordersCreated ?? 0
                    }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-checkout-success')
                    }}</span>
                    <span class="admin-detail-value">{{
                        props.metrics.business.checkoutSuccess ?? 0
                    }}</span>
                </div>
            </div>
        </div>

        <div v-if="props.health" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-system') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-environment') }}</span>
                    <span class="admin-detail-value">{{ props.health.environment }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-service') }}</span>
                    <span class="admin-detail-value">{{ props.health.service }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-node-version') }}</span>
                    <span class="admin-detail-value">{{ props.health.nodeVersion }}</span>
                </div>
                <template v-if="props.health.memory">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{
                            t('admin-page.label-heap-used')
                        }}</span>
                        <span class="admin-detail-value"
                            >{{ props.health.memory.heapUsedMb }} MB</span
                        >
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{
                            t('admin-page.label-heap-total')
                        }}</span>
                        <span class="admin-detail-value"
                            >{{ props.health.memory.heapTotalMb }} MB</span
                        >
                    </div>
                </template>
                <template v-if="props.health.system">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-platform') }}</span>
                        <span class="admin-detail-value">{{ props.health.system.platform }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{
                            t('admin-page.label-cpu-count')
                        }}</span>
                        <span class="admin-detail-value">{{ props.health.system.cpuCount }}</span>
                    </div>
                </template>
                <template v-if="props.health.integrations">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-loki') }}</span>
                        <span class="admin-detail-value">{{
                            props.health.integrations.loki ? '✓' : '✗'
                        }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-posthog') }}</span>
                        <span class="admin-detail-value">{{
                            props.health.integrations.posthog ? '✓' : '✗'
                        }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-otel') }}</span>
                        <span class="admin-detail-value">{{
                            props.health.integrations.otelEnabled ? '✓' : '✗'
                        }}</span>
                    </div>
                </template>
            </div>
        </div>

        <div v-if="!loading && !props.health && !props.metrics" class="admin-empty-state">
            {{ t('generic.no-data') }}
        </div>
    </div>
</template>
