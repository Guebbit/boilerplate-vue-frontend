<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RefreshCw } from 'lucide-vue-next';
import type { ObservabilityHealth, ObservabilityMetricsSummary } from '@types';
import type { AdminKpiCard } from '@/modules/admin/types.ts';
import {
    EMPTY_VALUE,
    formatMegabytes,
    formatTime,
    formatUptime
} from '@/infrastructure/utils/formatters.ts';
import DefinitionRow from '@/ui/molecules/DefinitionRow.vue';

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
 * Formats an error rate as a percentage.
 *
 * @param rate - Ratio in the 0..1 range, possibly unknown.
 * @returns The rate with one decimal and a `%` sign, or a dash when unknown.
 */
const formatErrorRate = (rate?: number): string => {
    if (rate === undefined) return EMPTY_VALUE;
    return `${(rate * 100).toFixed(1)}%`;
};

/**
 * Status color driver of the API health card.
 *
 * @returns `loading` while fetching, `error` on a failed call, `unknown` with no
 *  data, then `ok`/`warn` from the reported status.
 */
const healthStatus = computed((): AdminKpiCard['status'] => {
    if (loading.value) return 'loading';
    if (props.healthError) return 'error';
    if (!props.health) return 'unknown';
    return props.health.status === 'ok' ? 'ok' : 'warn';
});

/**
 * Status colour for one backing service, in the vocabulary the API reports for all of them.
 *
 * `disabled` is deliberately `ok` and not a warning: a deployment that runs without Redis or
 * without RabbitMQ is a supported configuration, and colouring it amber would leave the card
 * permanently yellow on exactly the deployments that chose it.
 *
 * @param state - the dependency's reported state
 * @returns the KPI card status to paint it with
 */
const dependencyStatus = (state?: string): AdminKpiCard['status'] => {
    if (!state) return 'unknown';
    if (state === 'ready' || state === 'disabled') return 'ok';
    if (state === 'connecting') return 'warn';
    return 'error';
};

/**
 * Status color driver of the error cards.
 *
 * @returns `error` above a 10% error rate, `warn` above 2%, `ok` below, and
 *  `unknown` with no metrics data.
 */
const errorRateStatus = computed((): AdminKpiCard['status'] => {
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
const kpiCards = computed<AdminKpiCard[]>(() => [
    {
        title: t('admin-page.kpi-api-status'),
        value: props.health?.status ?? EMPTY_VALUE,
        hint: props.healthError ?? undefined,
        status: healthStatus.value
    },
    {
        title: t('admin-page.kpi-database'),
        value: props.health?.dependencies.database.status ?? EMPTY_VALUE,
        status: dependencyStatus(props.health?.dependencies.database.status)
    },
    {
        title: t('admin-page.kpi-cache'),
        value: props.health?.dependencies.cache.status ?? EMPTY_VALUE,
        status: dependencyStatus(props.health?.dependencies.cache.status)
    },
    {
        title: t('admin-page.kpi-queue'),
        value: props.health?.dependencies.queue.status ?? EMPTY_VALUE,
        status: dependencyStatus(props.health?.dependencies.queue.status)
    },
    {
        title: t('admin-page.kpi-uptime'),
        value: formatUptime(props.health?.uptimeSeconds ?? props.metrics?.process.uptimeSeconds),
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-requests'),
        value: props.metrics?.http.totalRequests ?? EMPTY_VALUE,
        hint: props.metricsError ?? undefined,
        status: loading.value ? 'loading' : 'ok'
    },
    {
        title: t('admin-page.kpi-errors'),
        value: props.metrics?.http.totalErrors ?? EMPTY_VALUE,
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
                ? EMPTY_VALUE
                : `${props.metrics.http.latencyMs.p50} ms`,
        status: 'ok'
    },
    {
        title: t('admin-page.kpi-latency-p95'),
        value:
            props.metrics?.http.latencyMs.p95 === undefined
                ? EMPTY_VALUE
                : `${props.metrics.http.latencyMs.p95} ms`,
        status: 'ok'
    }
]);

/**
 * Maps a KPI status onto the status dot's background class.
 *
 * Returns the full literal class name rather than interpolating `bg-${color}`: Tailwind's
 * scanner only generates a utility for a class name it can see written out somewhere in the
 * source, and a template-literal-built name is invisible to it — the dot would carry no
 * background at all.
 *
 * @param status - Status of the card, possibly unset.
 * @returns The Tailwind background class, defaulting to `bg-secondary`.
 */
const kpiDotClass = (status: AdminKpiCard['status']) =>
    ({
        ok: 'bg-success',
        warn: 'bg-warning',
        error: 'bg-error',
        loading: 'bg-info',
        unknown: 'bg-secondary'
    })[status ?? 'unknown'];

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
                {{ formatTime(props.health.timestamp) }}
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
                        :class="kpiDotClass(card.status)"
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
                <DefinitionRow :label="t('admin-page.label-login-success')">{{
                    props.metrics.auth.loginSuccess ?? 0
                }}</DefinitionRow>
                <DefinitionRow :label="t('admin-page.label-login-failure')"
                    ><span class="text-warning">{{
                        props.metrics.auth.loginFailure ?? 0
                    }}</span></DefinitionRow
                >
                <DefinitionRow :label="t('admin-page.label-signup-success')">{{
                    props.metrics.auth.signupSuccess ?? 0
                }}</DefinitionRow>
            </dl>
        </v-card>

        <v-card v-if="props.metrics?.business" class="p-5" variant="flat" border>
            <h3 class="mb-3 text-lg font-semibold">{{ t('admin-page.section-business') }}</h3>
            <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                <DefinitionRow :label="t('admin-page.label-orders-created')">{{
                    props.metrics.business.ordersCreated ?? 0
                }}</DefinitionRow>
                <DefinitionRow :label="t('admin-page.label-checkout-success')">{{
                    props.metrics.business.checkoutSuccess ?? 0
                }}</DefinitionRow>
            </dl>
        </v-card>

        <v-card v-if="props.health" class="p-5" variant="flat" border>
            <h3 class="mb-3 text-lg font-semibold">{{ t('admin-page.section-system') }}</h3>
            <dl class="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                <DefinitionRow :label="t('admin-page.label-environment')">{{
                    props.health.environment
                }}</DefinitionRow>
                <DefinitionRow :label="t('admin-page.label-service')">{{
                    props.health.service
                }}</DefinitionRow>
                <DefinitionRow :label="t('admin-page.label-node-version')">{{
                    props.health.nodeVersion
                }}</DefinitionRow>
                <template v-if="props.health.memory">
                    <DefinitionRow :label="t('admin-page.label-heap-used')">{{
                        formatMegabytes(props.health.memory.heapUsed)
                    }}</DefinitionRow>
                    <DefinitionRow :label="t('admin-page.label-heap-total')">{{
                        formatMegabytes(props.health.memory.heapTotal)
                    }}</DefinitionRow>
                </template>
                <template v-if="props.health.system">
                    <DefinitionRow :label="t('admin-page.label-platform')">{{
                        props.health.system.platform
                    }}</DefinitionRow>
                    <DefinitionRow :label="t('admin-page.label-cpu-count')">{{
                        props.health.system.cpuCount
                    }}</DefinitionRow>
                </template>
                <!--
                    Telemetry sinks: which ones this deployment is WIRED TO, read off the API's
                    environment rather than probed. They sit apart from the dependency cards above
                    on purpose — losing one costs visibility, not capability.
                -->
                <template v-if="props.health.telemetry">
                    <DefinitionRow :label="t('admin-page.label-loki')">{{
                        flag(props.health.telemetry.loki)
                    }}</DefinitionRow>
                    <DefinitionRow :label="t('admin-page.label-faro')">{{
                        flag(props.health.telemetry.faro)
                    }}</DefinitionRow>
                    <DefinitionRow :label="t('admin-page.label-umami')">{{
                        flag(props.health.telemetry.umami)
                    }}</DefinitionRow>
                    <DefinitionRow :label="t('admin-page.label-otel')">{{
                        flag(props.health.telemetry.otel)
                    }}</DefinitionRow>
                </template>
            </dl>
        </v-card>

        <v-empty-state
            v-if="!loading && !props.health && !props.metrics"
            :title="t('generic.no-data')"
        />
    </div>
</template>
