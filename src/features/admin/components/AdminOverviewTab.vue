<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshCw } from 'lucide-vue-next';
import type { ObservabilityHealth, ObservabilityMetricsSummary } from '@types';
import type { IAdminKpiCard } from '../types';

const { t } = useI18n();

const props = defineProps<{
    health?: ObservabilityHealth;
    metrics?: ObservabilityMetricsSummary;
    loading: boolean;
    healthError?: string;
    metricsError?: string;
    onRefresh: () => Promise<void>;
}>();

/**
 * Local alias of the loading prop, so the KPI helpers below read consistently.
 *
 * @returns `true` while the dashboard data is being fetched.
 */
const loading = computed(() => props.loading);

/**
 * Formats a process uptime in a compact, human form.
 *
 * @param seconds - Uptime in seconds, possibly unknown.
 * @returns `"2h 15m"`, `"15m"`, or a dash when `seconds` is `undefined`.
 */
const formatUptime = (seconds?: number): string => {
    if (seconds === undefined) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/**
 * Formats an error rate as a percentage.
 *
 * @param rate - Ratio in the 0..1 range, possibly unknown.
 * @returns The rate with one decimal and a `%` sign, or a dash when unknown.
 */
const formatErrorRate = (rate?: number): string => {
    if (rate === undefined) return '—';
    return `${(rate * 100).toFixed(1)}%`;
};

/**
 * Status color driver of the API health card.
 *
 * @returns `loading` while fetching, `error` on a failed call, `unknown` with no
 *  data, then `ok`/`warn` from the reported status.
 */
const healthStatus = computed((): IAdminKpiCard['status'] => {
    if (loading.value) return 'loading';
    if (props.healthError) return 'error';
    if (!props.health) return 'unknown';
    return props.health.status === 'ok' ? 'ok' : 'warn';
});

/**
 * Status color driver of the database card.
 *
 * @returns `ok` when the database reports itself connected, `error` otherwise,
 *  `unknown` with no health data.
 */
const databaseStatus = computed((): IAdminKpiCard['status'] => {
    if (!props.health) return 'unknown';
    return props.health.database.status === 'connected' ? 'ok' : 'error';
});

/**
 * Status color driver of the error cards.
 *
 * @returns `error` above a 10% error rate, `warn` above 2%, `ok` below, and
 *  `unknown` with no metrics data.
 */
const errorRateStatus = computed((): IAdminKpiCard['status'] => {
    if (!props.metrics) return 'unknown';
    const rate = props.metrics.http.errorRate;
    if (rate > 0.1) return 'error';
    if (rate > 0.02) return 'warn';
    return 'ok';
});

/**
 * The KPI row of the overview tab.
 *
 * @returns One card per metric (status, database, uptime, requests, errors,
 *  error rate, p50/p95 latency), each with its value, hint and status.
 */
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

/**
 * Maps a KPI status onto a theme color, used for the card's accent border and
 * value.
 *
 * @param status - Status of the card, possibly unset.
 * @returns The Vuetify color name, defaulting to `secondary`.
 */
const kpiColor = (status: IAdminKpiCard['status']) =>
    ({
        ok: 'success',
        warn: 'warning',
        error: 'error',
        loading: 'info',
        unknown: 'secondary'
    })[status ?? 'unknown'] ?? 'secondary';

/**
 * Renders a boolean integration row as a glyph.
 *
 * @param value - Whether the integration is enabled; `undefined` counts as off.
 * @returns `✓` when enabled, `✗` otherwise.
 */
const flag = (value?: boolean) => (value ? '✓' : '✗');
</script>

<template>
    <div class="grid gap-6">
        <div class="flex flex-wrap items-center gap-3">
            <v-btn color="primary" variant="tonal" :disabled="loading" @click="props.onRefresh">
                <RefreshCw :size="16" class="mr-1" aria-hidden="true" />
                {{ loading ? t('generic.loading-state') : t('admin-page.button-refresh') }}
            </v-btn>
            <span v-if="props.health?.timestamp" class="text-sm opacity-70">
                {{ t('admin-page.label-last-updated') }}:
                {{ new Date(props.health.timestamp).toLocaleTimeString() }}
            </span>
        </div>

        <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <v-card v-for="card in kpiCards" :key="card.title" class="p-4" variant="flat" border>
                <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-medium uppercase tracking-widest opacity-80">
                        {{ card.title }}
                    </p>
                    <span
                        class="h-2 w-2 shrink-0 rounded-full"
                        :class="`bg-${kpiColor(card.status)}`"
                        aria-hidden="true"
                    />
                </div>
                <p class="mt-2 text-2xl font-semibold leading-tight">{{ card.value }}</p>
                <p v-if="card.hint" class="mt-1 text-xs text-error">{{ card.hint }}</p>
            </v-card>
        </div>

        <v-card v-if="props.metrics?.auth" class="p-5" variant="flat" border>
            <h3 class="mb-3 text-lg font-semibold">{{ t('admin-page.section-auth') }}</h3>
            <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-login-success') }}</dt>
                    <dd class="font-medium">{{ props.metrics.auth.loginSuccess ?? 0 }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-login-failure') }}</dt>
                    <dd class="font-medium text-warning">
                        {{ props.metrics.auth.loginFailure ?? 0 }}
                    </dd>
                </div>
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-signup-success') }}</dt>
                    <dd class="font-medium">{{ props.metrics.auth.signupSuccess ?? 0 }}</dd>
                </div>
            </dl>
        </v-card>

        <v-card v-if="props.metrics?.business" class="p-5" variant="flat" border>
            <h3 class="mb-3 text-lg font-semibold">{{ t('admin-page.section-business') }}</h3>
            <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-orders-created') }}</dt>
                    <dd class="font-medium">{{ props.metrics.business.ordersCreated ?? 0 }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-checkout-success') }}</dt>
                    <dd class="font-medium">{{ props.metrics.business.checkoutSuccess ?? 0 }}</dd>
                </div>
            </dl>
        </v-card>

        <v-card v-if="props.health" class="p-5" variant="flat" border>
            <h3 class="mb-3 text-lg font-semibold">{{ t('admin-page.section-system') }}</h3>
            <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-environment') }}</dt>
                    <dd class="font-medium">{{ props.health.environment }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-service') }}</dt>
                    <dd class="font-medium">{{ props.health.service }}</dd>
                </div>
                <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                    <dt class="opacity-70">{{ t('admin-page.label-node-version') }}</dt>
                    <dd class="font-medium">{{ props.health.nodeVersion }}</dd>
                </div>
                <template v-if="props.health.memory">
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-heap-used') }}</dt>
                        <dd class="font-medium">{{ props.health.memory.heapUsedMb }} MB</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-heap-total') }}</dt>
                        <dd class="font-medium">{{ props.health.memory.heapTotalMb }} MB</dd>
                    </div>
                </template>
                <template v-if="props.health.system">
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-platform') }}</dt>
                        <dd class="font-medium">{{ props.health.system.platform }}</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-cpu-count') }}</dt>
                        <dd class="font-medium">{{ props.health.system.cpuCount }}</dd>
                    </div>
                </template>
                <template v-if="props.health.integrations">
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-loki') }}</dt>
                        <dd class="font-medium">{{ flag(props.health.integrations.loki) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-faro') }}</dt>
                        <dd class="font-medium">{{ flag(props.health.integrations.faro) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-umami') }}</dt>
                        <dd class="font-medium">{{ flag(props.health.integrations.umami) }}</dd>
                    </div>
                    <div class="flex justify-between gap-4 border-b border-on-surface/10 py-1">
                        <dt class="opacity-70">{{ t('admin-page.label-otel') }}</dt>
                        <dd class="font-medium">
                            {{ flag(props.health.integrations.otelEnabled) }}
                        </dd>
                    </div>
                </template>
            </dl>
        </v-card>

        <v-empty-state
            v-if="!loading && !props.health && !props.metrics"
            :title="t('generic.no-data')"
        />
    </div>
</template>
