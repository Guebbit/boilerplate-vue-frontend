<script lang="ts">
export default {
    name: 'AdminPage'
};
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminDashboard } from '@/composables/useAdminDashboard.ts';
import type { AdminTabKey, IAdminKpiCard, AuditEventItem } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

const { t } = useI18n();

const activeTab = ref<AdminTabKey>('overview');

const {
    health,
    metrics,
    auditItems,
    auditTotal,
    loadingHealth,
    loadingMetrics,
    loadingAudit,
    errorHealth,
    errorMetrics,
    errorAudit,
    fetchAll,
    fetchAudit
} = useAdminDashboard();

onMounted(() => fetchAll());

// ---- KPI cards derived from contract types ----

const kpiCards = computed<IAdminKpiCard[]>(() => {
    const h = health.value;
    const m = metrics.value;
    return [
        {
            title: t('admin-page.kpi-status'),
            value: h?.status ?? '—',
            status: h?.status === 'ok' ? 'ok' : h?.status === 'degraded' ? 'warn' : undefined
        },
        {
            title: t('admin-page.kpi-uptime'),
            value: h ? formatUptime(h.uptimeSeconds) : '—',
            hint: t('admin-page.kpi-uptime-hint')
        },
        {
            title: t('admin-page.kpi-db'),
            value: h?.database?.status ?? '—',
            status: h?.database?.status === 'connected' ? 'ok' : 'warn'
        },
        {
            title: t('admin-page.kpi-requests'),
            value: m?.http?.totalRequests ?? '—'
        },
        {
            title: t('admin-page.kpi-errors'),
            value: m?.http?.totalErrors ?? '—',
            status: (m?.http?.errorRate ?? 0) > 0.05 ? 'warn' : 'ok'
        },
        {
            title: t('admin-page.kpi-latency-p95'),
            value: m?.http?.latencyMs?.p95 === undefined ? '—' : `${m.http.latencyMs.p95} ms`
        }
    ];
});

// ---- Audit filters ----

const auditFilters = ref({
    actor: '',
    action: '',
    outcome: undefined as 'success' | 'failure' | undefined
});

const handleAuditSearch = () =>
    fetchAudit({
        actor: auditFilters.value.actor || undefined,
        action: auditFilters.value.action || undefined,
        outcome: auditFilters.value.outcome
    });

// ---- Helpers ----

const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const auditColumns: { key: keyof AuditEventItem | 'timestamp_fmt'; label: string }[] = [
    { key: 'timestamp_fmt', label: t('admin-page.audit-col-time') },
    { key: 'actor_user_id', label: t('admin-page.audit-col-actor') },
    { key: 'actor_role', label: t('admin-page.audit-col-role') },
    { key: 'action', label: t('admin-page.audit-col-action') },
    { key: 'outcome', label: t('admin-page.audit-col-outcome') },
    { key: 'ip', label: t('admin-page.audit-col-ip') }
];
</script>

<template>
    <LayoutDefault id="admin-page">
        <template #header>
            <div class="admin-page-header">
                <h1 class="theme-page-title">
                    <span>{{ t('admin-page.page-title') }}</span>
                </h1>
                <button
                    class="theme-button admin-refresh-button"
                    :disabled="loadingHealth || loadingMetrics || loadingAudit"
                    @click="fetchAll"
                >
                    ↺ {{ t('admin-page.button-refresh') }}
                </button>
            </div>
        </template>

        <!-- KPI cards -->
        <section class="admin-kpi-row">
            <div
                v-for="card in kpiCards"
                :key="card.title"
                class="theme-card admin-kpi-card"
                :class="card.status ? `admin-kpi-card-${card.status}` : ''"
            >
                <p class="admin-kpi-label">{{ card.title }}</p>
                <p class="admin-kpi-value">{{ card.value }}</p>
                <p v-if="card.hint" class="admin-kpi-hint">{{ card.hint }}</p>
            </div>
        </section>

        <!-- Tabs -->
        <div class="admin-tabs">
            <button
                class="theme-button admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === 'overview' }"
                @click="activeTab = 'overview'"
            >
                {{ t('admin-page.tab-overview') }}
            </button>
            <button
                class="theme-button admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === 'metrics' }"
                @click="activeTab = 'metrics'"
            >
                {{ t('admin-page.tab-metrics') }}
            </button>
            <button
                class="theme-button admin-tab-button"
                :class="{ 'admin-tab-button-active': activeTab === 'audit' }"
                @click="activeTab = 'audit'"
            >
                {{ t('admin-page.tab-audit') }}
            </button>
        </div>

        <!-- Overview tab -->
        <section v-if="activeTab === 'overview'" class="admin-tab-panel">
            <p v-if="loadingHealth" class="admin-loading">{{ t('generic.loading-state') }}</p>
            <p v-else-if="errorHealth" class="admin-error">{{ errorHealth }}</p>
            <div v-else-if="health" class="admin-overview-grid">
                <div class="theme-card">
                    <h3>{{ t('admin-page.overview-system') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.overview-service') }}</dt>
                        <dd>{{ health.service }}</dd>
                        <dt>{{ t('admin-page.overview-env') }}</dt>
                        <dd>{{ health.environment }}</dd>
                        <dt>{{ t('admin-page.overview-node') }}</dt>
                        <dd>{{ health.nodeVersion }}</dd>
                        <dt>{{ t('admin-page.overview-uptime') }}</dt>
                        <dd>{{ formatUptime(health.uptimeSeconds) }}</dd>
                        <dt>{{ t('admin-page.overview-timestamp') }}</dt>
                        <dd>{{ formatDateTime(health.timestamp) }}</dd>
                    </dl>
                </div>

                <div v-if="health.memory" class="theme-card">
                    <h3>{{ t('admin-page.overview-memory') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.overview-heap-used') }}</dt>
                        <dd>{{ health.memory.heapUsedMb }} MB</dd>
                        <dt>{{ t('admin-page.overview-heap-total') }}</dt>
                        <dd>{{ health.memory.heapTotalMb }} MB</dd>
                        <dt>{{ t('admin-page.overview-rss') }}</dt>
                        <dd>{{ health.memory.rssMb }} MB</dd>
                    </dl>
                </div>

                <div v-if="health.system" class="theme-card">
                    <h3>{{ t('admin-page.overview-system-info') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.overview-platform') }}</dt>
                        <dd>{{ health.system.platform }}</dd>
                        <dt>{{ t('admin-page.overview-cpus') }}</dt>
                        <dd>{{ health.system.cpuCount }}</dd>
                        <dt>{{ t('admin-page.overview-load') }}</dt>
                        <dd>{{ health.system.loadAvg.map((n) => n.toFixed(2)).join(' / ') }}</dd>
                    </dl>
                </div>

                <div v-if="health.integrations" class="theme-card">
                    <h3>{{ t('admin-page.overview-integrations') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>Loki</dt>
                        <dd>{{ health.integrations.loki ? '✓' : '✗' }}</dd>
                        <dt>PostHog</dt>
                        <dd>{{ health.integrations.posthog ? '✓' : '✗' }}</dd>
                        <dt>OpenTelemetry</dt>
                        <dd>{{ health.integrations.otelEnabled ? '✓' : '✗' }}</dd>
                    </dl>
                </div>
            </div>
            <p v-else class="admin-empty">{{ t('admin-page.overview-no-data') }}</p>
        </section>

        <!-- Metrics tab -->
        <section v-else-if="activeTab === 'metrics'" class="admin-tab-panel">
            <p v-if="loadingMetrics" class="admin-loading">{{ t('generic.loading-state') }}</p>
            <p v-else-if="errorMetrics" class="admin-error">{{ errorMetrics }}</p>
            <div v-else-if="metrics" class="admin-overview-grid">
                <div class="theme-card">
                    <h3>{{ t('admin-page.metrics-http') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.metrics-total-requests') }}</dt>
                        <dd>{{ metrics.http.totalRequests }}</dd>
                        <dt>{{ t('admin-page.metrics-total-errors') }}</dt>
                        <dd>{{ metrics.http.totalErrors }}</dd>
                        <dt>{{ t('admin-page.metrics-error-rate') }}</dt>
                        <dd>{{ (metrics.http.errorRate * 100).toFixed(1) }}%</dd>
                        <dt>{{ t('admin-page.metrics-in-flight') }}</dt>
                        <dd>{{ metrics.http.inFlight }}</dd>
                        <dt>{{ t('admin-page.metrics-p50') }}</dt>
                        <dd>{{ metrics.http.latencyMs.p50 }} ms</dd>
                        <dt>{{ t('admin-page.metrics-p95') }}</dt>
                        <dd>{{ metrics.http.latencyMs.p95 }} ms</dd>
                    </dl>
                </div>

                <div class="theme-card">
                    <h3>{{ t('admin-page.metrics-auth') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.metrics-login-ok') }}</dt>
                        <dd>{{ metrics.auth?.loginSuccess ?? '—' }}</dd>
                        <dt>{{ t('admin-page.metrics-login-fail') }}</dt>
                        <dd>{{ metrics.auth?.loginFailure ?? '—' }}</dd>
                        <dt>{{ t('admin-page.metrics-signup-ok') }}</dt>
                        <dd>{{ metrics.auth?.signupSuccess ?? '—' }}</dd>
                    </dl>
                </div>

                <div class="theme-card">
                    <h3>{{ t('admin-page.metrics-business') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.metrics-checkout-ok') }}</dt>
                        <dd>{{ metrics.business?.checkoutSuccess ?? '—' }}</dd>
                        <dt>{{ t('admin-page.metrics-orders-created') }}</dt>
                        <dd>{{ metrics.business?.ordersCreated ?? '—' }}</dd>
                    </dl>
                </div>

                <div class="theme-card">
                    <h3>{{ t('admin-page.metrics-db') }}</h3>
                    <dl class="admin-detail-list">
                        <dt>{{ t('admin-page.metrics-db-queries') }}</dt>
                        <dd>{{ metrics.database?.queriesTotal ?? '—' }}</dd>
                        <dt>{{ t('admin-page.metrics-db-errors') }}</dt>
                        <dd>{{ metrics.database?.errorsTotal ?? '—' }}</dd>
                    </dl>
                </div>
            </div>
            <p v-else class="admin-empty">{{ t('admin-page.metrics-no-data') }}</p>
        </section>

        <!-- Audit tab -->
        <section v-else-if="activeTab === 'audit'" class="admin-tab-panel">
            <form class="admin-audit-filters" @submit.prevent="handleAuditSearch">
                <input
                    v-model="auditFilters.actor"
                    class="theme-input"
                    :placeholder="t('admin-page.audit-filter-actor')"
                />
                <input
                    v-model="auditFilters.action"
                    class="theme-input"
                    :placeholder="t('admin-page.audit-filter-action')"
                />
                <select v-model="auditFilters.outcome" class="theme-input">
                    <option :value="undefined">
                        {{ t('admin-page.audit-filter-outcome-all') }}
                    </option>
                    <option value="success">
                        {{ t('admin-page.audit-filter-outcome-success') }}
                    </option>
                    <option value="failure">
                        {{ t('admin-page.audit-filter-outcome-failure') }}
                    </option>
                </select>
                <button type="submit" class="theme-button" :disabled="loadingAudit">
                    {{ t('generic.search') }}
                </button>
            </form>

            <p v-if="loadingAudit" class="admin-loading">{{ t('generic.loading-state') }}</p>
            <p v-else-if="errorAudit" class="admin-error">{{ errorAudit }}</p>
            <template v-else>
                <p class="admin-audit-total">
                    {{ t('admin-page.audit-total', { count: auditTotal }) }}
                </p>
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th v-for="col in auditColumns" :key="col.key">{{ col.label }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(event, index) in auditItems" :key="index">
                                <td>{{ formatDateTime(event.timestamp) }}</td>
                                <td>{{ event.actor_user_id }}</td>
                                <td>
                                    <span
                                        class="admin-badge"
                                        :class="`admin-badge-${event.actor_role}`"
                                    >
                                        {{ event.actor_role }}
                                    </span>
                                </td>
                                <td>{{ event.action }}</td>
                                <td>
                                    <span
                                        class="admin-badge"
                                        :class="
                                            event.outcome === 'success'
                                                ? 'admin-badge-ok'
                                                : 'admin-badge-error'
                                        "
                                    >
                                        {{ event.outcome }}
                                    </span>
                                </td>
                                <td>{{ event.ip ?? '—' }}</td>
                            </tr>
                            <tr v-if="auditItems.length === 0">
                                <td :colspan="auditColumns.length" class="admin-table-empty">
                                    {{ t('admin-page.audit-empty') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </section>
    </LayoutDefault>
</template>

<style lang="scss">
#admin-page {
    .admin-page-header {
        display: flex;
        align-items: center;
        gap: 1rem;

        .admin-refresh-button {
            margin-left: auto;
        }
    }

    .admin-kpi-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .admin-kpi-card {
        flex: 1 1 160px;
        min-width: 140px;
        padding: 1rem;

        .admin-kpi-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 0.25rem;
            opacity: 0.7;
        }

        .admin-kpi-value {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 0;
        }

        .admin-kpi-hint {
            font-size: 0.7rem;
            margin: 0.25rem 0 0;
            opacity: 0.6;
        }

        &.admin-kpi-card-ok .admin-kpi-value {
            color: rgb(var(--tertiary-600, 34 197 94));
        }

        &.admin-kpi-card-warn .admin-kpi-value {
            color: rgb(var(--secondary-600, 234 179 8));
        }

        &.admin-kpi-card-error .admin-kpi-value {
            color: rgb(var(--primary-600, 239 68 68));
        }
    }

    .admin-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid var(--color-border);
        padding-bottom: 0.5rem;

        .admin-tab-button {
            border-radius: 4px 4px 0 0;
        }

        .admin-tab-button-active {
            background: rgb(var(--secondary-600));
            color: rgb(var(--on-secondary-600));
        }
    }

    .admin-tab-panel {
        min-height: 200px;
    }

    .admin-overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;

        .theme-card {
            padding: 1rem;

            h3 {
                margin: 0 0 0.75rem;
                font-size: 0.95rem;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
        }
    }

    .admin-detail-list {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.3rem 1rem;
        margin: 0;
        font-size: 0.875rem;

        dt {
            opacity: 0.65;
            white-space: nowrap;
        }

        dd {
            margin: 0;
            font-weight: 500;
            word-break: break-all;
        }
    }

    .admin-audit-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;

        .theme-input {
            flex: 1 1 180px;
            padding: 0.4rem 0.6rem;
            border: 1px solid var(--color-border);
            border-radius: 4px;
            background: var(--color-background);
            color: var(--color-text);
        }
    }

    .admin-audit-total {
        font-size: 0.85rem;
        opacity: 0.7;
        margin-bottom: 0.5rem;
    }

    .admin-table-wrapper {
        overflow-x: auto;
    }

    .admin-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        th,
        td {
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid var(--color-border);
            text-align: left;
            white-space: nowrap;
        }

        th {
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 0.75rem;
            opacity: 0.75;
        }

        .admin-table-empty {
            text-align: center;
            padding: 2rem;
            opacity: 0.5;
        }
    }

    .admin-badge {
        display: inline-block;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;

        &.admin-badge-ok,
        &.admin-badge-success {
            background: rgba(34, 197, 94, 0.15);
            color: rgb(21, 128, 61);
        }

        &.admin-badge-error,
        &.admin-badge-failure {
            background: rgba(239, 68, 68, 0.15);
            color: rgb(185, 28, 28);
        }

        &.admin-badge-admin {
            background: rgba(99, 102, 241, 0.15);
            color: rgb(67, 56, 202);
        }

        &.admin-badge-user {
            background: rgba(59, 130, 246, 0.15);
            color: rgb(29, 78, 216);
        }

        &.admin-badge-anonymous {
            background: rgba(156, 163, 175, 0.15);
            color: rgb(75, 85, 99);
        }
    }

    .admin-loading,
    .admin-empty {
        opacity: 0.6;
        padding: 2rem 0;
        text-align: center;
    }

    .admin-error {
        color: rgb(185, 28, 28);
        padding: 1rem;
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 4px;
        background: rgba(239, 68, 68, 0.05);
    }
}
</style>
