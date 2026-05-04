<script lang="ts">
export default { name: 'AdminAuditTab' };
</script>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminAudit } from '@/composables/useAdminAudit.ts';
import type { IAdminAuditFilters } from '@/types/admin.ts';

const { t } = useI18n();

const { auditEvents, total, loading, error, fetchAuditLogs } = useAdminAudit();

const filters = reactive<IAdminAuditFilters>({
    actor: '',
    action: '',
    outcome: '',
    since: '',
    limit: 50
});

const handleSearch = () => {
    fetchAuditLogs(filters);
};

const handleReset = () => {
    filters.actor = '';
    filters.action = '';
    filters.outcome = '';
    filters.since = '';
    filters.limit = 50;
    fetchAuditLogs(filters);
};

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
};

onMounted(() => fetchAuditLogs(filters));
</script>

<template>
    <div class="admin-audit-tab">
        <!-- Filters -->
        <form class="admin-audit-filters" @submit.prevent="handleSearch">
            <input
                v-model="filters.actor"
                class="theme-input"
                type="text"
                :placeholder="t('admin-page.audit-filter-actor')"
            />
            <input
                v-model="filters.action"
                class="theme-input"
                type="text"
                :placeholder="t('admin-page.audit-filter-action')"
            />
            <select v-model="filters.outcome" class="theme-select">
                <option value="">{{ t('admin-page.audit-filter-outcome-all') }}</option>
                <option value="success">{{ t('admin-page.audit-filter-outcome-success') }}</option>
                <option value="failure">{{ t('admin-page.audit-filter-outcome-failure') }}</option>
            </select>
            <input
                v-model="filters.since"
                class="theme-input"
                type="datetime-local"
                :placeholder="t('admin-page.audit-filter-since')"
            />
            <select v-model="filters.limit" class="theme-select">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
                <option :value="200">200</option>
            </select>
            <div class="admin-audit-filter-actions">
                <button type="submit" class="theme-button" :disabled="loading">
                    {{ t('generic.search') }}
                </button>
                <button type="button" class="theme-button" @click="handleReset">
                    {{ t('generic.reset') }}
                </button>
            </div>
        </form>

        <!-- Summary -->
        <div class="admin-audit-summary">
            {{
                t('admin-page.audit-showing', {
                    shown: auditEvents.length,
                    total
                })
            }}
        </div>

        <!-- Error state -->
        <div v-if="error" class="admin-error-state">{{ error }}</div>

        <!-- Empty state -->
        <div v-else-if="!loading && auditEvents.length === 0" class="admin-empty-state">
            {{ t('generic.no-data') }}
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="admin-loading-state">{{ t('generic.loading-state') }}</div>

        <!-- Table -->
        <div v-else class="admin-audit-table-wrapper">
            <table class="admin-audit-table">
                <thead>
                    <tr>
                        <th>{{ t('admin-page.audit-col-timestamp') }}</th>
                        <th>{{ t('admin-page.audit-col-actor') }}</th>
                        <th>{{ t('admin-page.audit-col-role') }}</th>
                        <th>{{ t('admin-page.audit-col-action') }}</th>
                        <th>{{ t('admin-page.audit-col-outcome') }}</th>
                        <th>{{ t('admin-page.audit-col-ip') }}</th>
                        <th>{{ t('admin-page.audit-col-request-id') }}</th>
                        <th>{{ t('admin-page.audit-col-trace-id') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(event, index) in auditEvents"
                        :key="`${event.timestamp}-${index}`"
                        :class="event.outcome === 'failure' ? 'admin-audit-row-failure' : ''"
                    >
                        <td class="admin-audit-cell-timestamp">
                            {{ formatDate(event.timestamp) }}
                        </td>
                        <td class="admin-audit-cell-actor">{{ event.actor_user_id }}</td>
                        <td>
                            <span class="admin-audit-badge" :class="`admin-audit-role-${event.actor_role}`">
                                {{ event.actor_role }}
                            </span>
                        </td>
                        <td class="admin-audit-cell-action">{{ event.action }}</td>
                        <td>
                            <span
                                class="admin-audit-badge"
                                :class="
                                    event.outcome === 'success'
                                        ? 'admin-audit-outcome-success'
                                        : 'admin-audit-outcome-failure'
                                "
                            >
                                {{ event.outcome }}
                            </span>
                        </td>
                        <td>{{ event.ip ?? '—' }}</td>
                        <td class="admin-audit-cell-id" :title="event.request_id">
                            {{ event.request_id ? event.request_id.slice(0, 8) + '…' : '—' }}
                        </td>
                        <td class="admin-audit-cell-id" :title="event.trace_id">
                            {{ event.trace_id ? event.trace_id.slice(0, 8) + '…' : '—' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
