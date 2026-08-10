<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import TableLoadingBar from '@/components/molecules/TableLoadingBar.vue';
import { Search } from 'lucide-vue-next';
import type { AuditEventItem } from '@types';
import type { IAdminAuditFilters } from '../types';

const { t } = useI18n();

const props = defineProps<{
    auditEvents: AuditEventItem[];
    total: number;
    loading: boolean;
    error?: string;
    onSearch: (filters?: IAdminAuditFilters) => Promise<void>;
}>();

/**
 * Live audit filter form state, sent as-is to the parent's search callback.
 */
const filters = reactive<IAdminAuditFilters>({
    actor: undefined,
    action: undefined,
    outcome: undefined,
    since: undefined,
    limit: 50
});

/**
 * Options of the outcome select.
 *
 * @returns The localized `all`/`success`/`failure` choices.
 */
const outcomeOptions = computed(() => [
    { value: undefined, label: t('admin-page.audit-filter-outcome-all') },
    { value: 'success', label: t('admin-page.audit-filter-outcome-success') },
    { value: 'failure', label: t('admin-page.audit-filter-outcome-failure') }
]);

/**
 * Selectable page sizes for the audit table.
 */
const limitOptions = [20, 50, 100, 200];

/**
 * Columns of the audit table.
 *
 * @returns The localized headers, keyed on the audit event fields.
 */
const tableHeaders = computed(() => [
    { title: t('admin-page.audit-col-timestamp'), key: 'timestamp' },
    { title: t('admin-page.audit-col-actor'), key: 'actor_user_id' },
    { title: t('admin-page.audit-col-role'), key: 'actor_role' },
    { title: t('admin-page.audit-col-action'), key: 'action' },
    { title: t('admin-page.audit-col-outcome'), key: 'outcome' },
    { title: t('admin-page.audit-col-ip'), key: 'ip' },
    { title: t('admin-page.audit-col-request-id'), key: 'request_id' },
    { title: t('admin-page.audit-col-trace-id'), key: 'trace_id' }
]);

/**
 * Runs the search with the current filters.
 */
const handleSearch = () => {
    void props.onSearch(filters);
};

/**
 * Clears every filter (keeping the default limit) and re-runs the search.
 */
const handleReset = () => {
    filters.actor = undefined;
    filters.action = undefined;
    filters.outcome = undefined;
    filters.since = undefined;
    filters.limit = 50;
    void props.onSearch(filters);
};

/**
 * Shortens a correlation id so it fits in a table cell.
 *
 * @param value - Request/trace id, possibly missing.
 * @param length - Number of leading characters to keep. Defaults to `8`.
 * @returns The truncated id followed by an ellipsis, or a dash when absent.
 */
const truncateId = (value?: string, length = 8) => (value ? `${value.slice(0, length)}...` : '—');

/**
 * Formats an audit timestamp for display.
 *
 * @param iso - ISO 8601 timestamp coming from the API.
 * @returns The locale-formatted date/time, or the raw string when unparseable.
 */
const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
};
</script>

<template>
    <div class="grid gap-4">
        <v-card class="p-5" variant="flat" border>
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                    <v-text-field
                        v-model="filters.actor"
                        type="text"
                        :label="t('admin-page.audit-filter-actor')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.action"
                        type="text"
                        :label="t('admin-page.audit-filter-action')"
                        hide-details
                    />
                    <v-select
                        v-model="filters.outcome"
                        :items="outcomeOptions"
                        item-title="label"
                        item-value="value"
                        :label="t('admin-page.audit-filter-outcome-all')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.since"
                        type="datetime-local"
                        :label="t('admin-page.audit-filter-since')"
                        hide-details
                    />
                    <v-select v-model="filters.limit" :items="limitOptions" hide-details />
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="props.loading">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                </div>
            </form>
        </v-card>

        <p class="m-0 text-sm opacity-70">
            {{
                t('admin-page.audit-showing', {
                    shown: props.auditEvents.length,
                    total: props.total
                })
            }}
        </p>

        <v-alert v-if="props.error" type="error" :text="props.error" />

        <v-data-table
            v-else
            :headers="tableHeaders"
            :items="props.auditEvents"
            :loading="props.loading"
            :no-data-text="t('generic.no-data')"
            items-per-page="-1"
            hide-default-footer
            class="rounded-xl border"
        >
            <!-- Replaces Vuetify's unnamed internal bar — see `TableLoadingBar` for why. -->
            <template #loader>
                <TableLoadingBar />
            </template>

            <template v-slot:[`item.timestamp`]="{ item }">
                <span class="whitespace-nowrap">{{ formatDate(item.timestamp) }}</span>
            </template>

            <template v-slot:[`item.actor_role`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.actor_role === 'admin' ? 'tertiary' : 'secondary'"
                >
                    {{ item.actor_role }}
                </v-chip>
            </template>

            <template v-slot:[`item.outcome`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.outcome === 'success' ? 'success' : 'error'"
                >
                    {{ item.outcome }}
                </v-chip>
            </template>

            <template v-slot:[`item.ip`]="{ item }">
                {{ item.ip ?? '—' }}
            </template>

            <template v-slot:[`item.request_id`]="{ item }">
                <span :title="item.request_id" class="font-mono text-xs">
                    {{ truncateId(item.request_id) }}
                </span>
            </template>

            <template v-slot:[`item.trace_id`]="{ item }">
                <span :title="item.trace_id" class="font-mono text-xs">
                    {{ truncateId(item.trace_id) }}
                </span>
            </template>
        </v-data-table>
    </div>
</template>
