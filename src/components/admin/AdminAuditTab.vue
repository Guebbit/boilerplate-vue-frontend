<script lang="ts">
export default { name: 'AdminAuditTab' };
</script>

<script setup lang="ts">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AuditEventItem } from '@types';
import type { IAdminAuditFilters } from '@/types/admin.ts';

const { t } = useI18n();

const props = defineProps<{
    auditEvents: AuditEventItem[];
    total: number;
    loading: boolean;
    error?: string;
    onSearch: (filters?: IAdminAuditFilters) => Promise<void>;
}>();

const filters = reactive<IAdminAuditFilters>({
    actor: undefined,
    action: undefined,
    outcome: undefined,
    since: undefined,
    limit: 50
});

const handleSearch = () => {
    void props.onSearch(filters);
};

const handleReset = () => {
    filters.actor = undefined;
    filters.action = undefined;
    filters.outcome = undefined;
    filters.since = undefined;
    filters.limit = 50;
    void props.onSearch(filters);
};

const truncateId = (value?: string, length = 8) =>
    value ? `${value.slice(0, length)}...` : '—';

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
};
</script>

<template>
    <div class="admin-audit-tab">
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
                <option :value="undefined">{{ t('admin-page.audit-filter-outcome-all') }}</option>
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
                <button type="submit" class="theme-button" :disabled="props.loading">
                    {{ t('generic.search') }}
                </button>
                <button type="button" class="theme-button" @click="handleReset">
                    {{ t('generic.reset') }}
                </button>
            </div>
        </form>

        <div class="admin-audit-summary">
            {{
                t('admin-page.audit-showing', {
                    shown: props.auditEvents.length,
                    total: props.total
                })
            }}
        </div>

        <div v-if="props.error" class="admin-error-state">{{ props.error }}</div>

        <div v-else-if="!props.loading && props.auditEvents.length === 0" class="admin-empty-state">
            {{ t('generic.no-data') }}
        </div>

        <div v-else-if="props.loading" class="admin-loading-state">
            {{ t('generic.loading-state') }}
        </div>

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
                        v-for="(event, index) in props.auditEvents"
                        :key="`${event.timestamp}-${index}`"
                        :class="event.outcome === 'failure' ? 'admin-audit-row-failure' : ''"
                    >
                        <td class="admin-audit-cell-timestamp">
                            {{ formatDate(event.timestamp) }}
                        </td>
                        <td class="admin-audit-cell-actor">{{ event.actorUserId }}</td>
                        <td>
                            <span class="admin-audit-badge" :class="`admin-audit-role-${event.actorRole}`">
                                {{ event.actorRole }}
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
                        <td class="admin-audit-cell-id" :title="event.requestId">
                            {{ truncateId(event.requestId) }}
                        </td>
                        <td class="admin-audit-cell-id" :title="event.traceId">
                            {{ truncateId(event.traceId) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
