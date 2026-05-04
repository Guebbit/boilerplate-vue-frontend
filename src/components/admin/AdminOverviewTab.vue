<script lang="ts">
export default { name: 'AdminOverviewTab' };
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminHealth } from '@/composables/useAdminHealth.ts';
import { useAdminMetrics } from '@/composables/useAdminMetrics.ts';
import type { IAdminKpi } from '@/types/admin.ts';

const { t } = useI18n();

const { health, loading: healthLoading, error: healthError, fetchHealth } = useAdminHealth();
const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    fetchMetrics
} = useAdminMetrics();

const loading = computed(() => healthLoading.value || metricsLoading.value);

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

const healthStatus = computed((): IAdminKpi['status'] => {
    if (healthLoading.value) return 'loading';
    if (healthError.value) return 'error';
    if (!health.value) return 'unknown';
    return health.value.status === 'ok' ? 'ok' : 'warn';
});

const databaseStatus = computed((): IAdminKpi['status'] => {
    if (!health.value) return 'unknown';
    return health.value.database.status === 'connected' ? 'ok' : 'error';
});

const errorRateStatus = computed((): IAdminKpi['status'] => {
    if (!metrics.value) return 'unknown';
    const rate = metrics.value.http.errorRate;
    if (rate > 0.1) return 'error';
    if (rate > 0.02) return 'warn';
    return 'ok';
});

const kpiCards = computed<IAdminKpi[]>(() => [
    {
        title: t('admin-page.kpi-api-status'),
        value: health.value?.status ?? '—',
        hint: healthError.value ?? undefined,
        status: healthStatus.value
    },
    {
        title: t('admin-page.kpi-database'),
        value: health.value?.database.status ?? '—',
        status: databaseStatus.value
    },
    {
        title: t('admin-page.kpi-uptime'),
        value: formatUptime(
            metrics.value?.process?.uptimeSeconds ?? health.value?.uptimeSeconds
        ),
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-requests'),
        value: metrics.value?.http.totalRequests ?? '—',
        hint: metricsError.value ?? undefined,
        status: metricsLoading.value ? 'loading' : 'ok'
    },
    {
        title: t('admin-page.kpi-errors'),
        value: metrics.value?.http.totalErrors ?? '—',
        status: errorRateStatus.value
    },
    {
        title: t('admin-page.kpi-error-rate'),
        value: formatErrorRate(metrics.value?.http.errorRate),
        status: errorRateStatus.value
    },
    {
        title: t('admin-page.kpi-latency-p50'),
        value:
            metrics.value?.http.latencyMs.p50 === undefined
                ? '—'
                : `${metrics.value.http.latencyMs.p50}ms`,
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-latency-p95'),
        value:
            metrics.value?.http.latencyMs.p95 === undefined
                ? '—'
                : `${metrics.value.http.latencyMs.p95}ms`,
        status: 'ok'
    }
]);

const refresh = async () => {
    await Promise.all([fetchHealth(), fetchMetrics()]);
};

onMounted(refresh);
</script>

<template>
    <div class="admin-overview-tab">
        <div class="admin-overview-controls">
            <button class="theme-button" :disabled="loading" @click="refresh">
                {{ loading ? t('generic.loading-state') : t('admin-page.button-refresh') }}
            </button>
            <span v-if="health?.timestamp" class="admin-overview-timestamp">
                {{ t('admin-page.label-last-updated') }}:
                {{ new Date(health.timestamp).toLocaleTimeString() }}
            </span>
        </div>

        <!-- KPI cards -->
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

        <!-- Auth metrics -->
        <div v-if="metrics?.auth" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-auth') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-login-success') }}</span>
                    <span class="admin-detail-value">{{ metrics.auth.loginSuccess ?? 0 }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-login-failure') }}</span>
                    <span class="admin-detail-value admin-detail-value-warn">{{
                        metrics.auth.loginFailure ?? 0
                    }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-signup-success') }}</span>
                    <span class="admin-detail-value">{{ metrics.auth.signupSuccess ?? 0 }}</span>
                </div>
            </div>
        </div>

        <!-- Business metrics -->
        <div v-if="metrics?.business" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-business') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-orders-created') }}</span>
                    <span class="admin-detail-value">{{ metrics.business.ordersCreated ?? 0 }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{
                        t('admin-page.label-checkout-success')
                    }}</span>
                    <span class="admin-detail-value">{{
                        metrics.business.checkoutSuccess ?? 0
                    }}</span>
                </div>
            </div>
        </div>

        <!-- System info -->
        <div v-if="health" class="admin-section">
            <h3 class="admin-section-title">{{ t('admin-page.section-system') }}</h3>
            <div class="admin-detail-grid">
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-environment') }}</span>
                    <span class="admin-detail-value">{{ health.environment }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-service') }}</span>
                    <span class="admin-detail-value">{{ health.service }}</span>
                </div>
                <div class="admin-detail-item">
                    <span class="admin-detail-label">{{ t('admin-page.label-node-version') }}</span>
                    <span class="admin-detail-value">{{ health.nodeVersion }}</span>
                </div>
                <template v-if="health.memory">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-heap-used') }}</span>
                        <span class="admin-detail-value">{{ health.memory.heapUsedMb }} MB</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-heap-total') }}</span>
                        <span class="admin-detail-value">{{ health.memory.heapTotalMb }} MB</span>
                    </div>
                </template>
                <template v-if="health.system">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-platform') }}</span>
                        <span class="admin-detail-value">{{ health.system.platform }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-cpu-count') }}</span>
                        <span class="admin-detail-value">{{ health.system.cpuCount }}</span>
                    </div>
                </template>
                <template v-if="health.integrations">
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-loki') }}</span>
                        <span class="admin-detail-value">{{
                            health.integrations.loki ? '✓' : '✗'
                        }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-posthog') }}</span>
                        <span class="admin-detail-value">{{
                            health.integrations.posthog ? '✓' : '✗'
                        }}</span>
                    </div>
                    <div class="admin-detail-item">
                        <span class="admin-detail-label">{{ t('admin-page.label-otel') }}</span>
                        <span class="admin-detail-value">{{
                            health.integrations.otelEnabled ? '✓' : '✗'
                        }}</span>
                    </div>
                </template>
            </div>
        </div>

        <div v-if="!loading && !health && !metrics" class="admin-empty-state">
            {{ t('generic.no-data') }}
        </div>
    </div>
</template>
