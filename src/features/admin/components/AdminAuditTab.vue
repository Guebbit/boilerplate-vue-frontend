<script setup lang="ts">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AuditEventItem } from '@types';
import type { IAdminAuditFilters } from '@/features/admin/types.ts';
import {
    VAlert,
    VBtn,
    VCard,
    VCardText,
    VChip,
    VCol,
    VProgressCircular,
    VRow,
    VSelect,
    VTable,
    VTextField
} from 'vuetify/components';

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

const outcomeOptions = [
    { title: t('admin-page.audit-filter-outcome-all'), value: undefined },
    { title: t('admin-page.audit-filter-outcome-success'), value: 'success' },
    { title: t('admin-page.audit-filter-outcome-failure'), value: 'failure' }
];
const limitOptions = [20, 50, 100, 200];

/*
 * Loads audit events with the current filters.
 */
const handleSearch = () => {
    void props.onSearch(filters);
};

/*
 * Restores defaults and reloads audit events.
 */
const handleReset = () => {
    filters.actor = undefined;
    filters.action = undefined;
    filters.outcome = undefined;
    filters.since = undefined;
    filters.limit = 50;
    void props.onSearch(filters);
};

const truncateId = (value?: string, length = 8) => (value ? `${value.slice(0, length)}...` : '—');

/*
 * Formats audit timestamps safely.
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
    <div>
        <VCard class="mb-4" rounded="lg" variant="outlined">
            <VCardText>
                <form @submit.prevent="handleSearch">
                    <VRow dense>
                        <VCol cols="12" md="4" lg="2">
                            <VTextField
                                v-model="filters.actor"
                                density="comfortable"
                                hide-details
                                :label="t('admin-page.audit-filter-actor')"
                                type="text"
                                variant="outlined"
                            />
                        </VCol>
                        <VCol cols="12" md="4" lg="2">
                            <VTextField
                                v-model="filters.action"
                                density="comfortable"
                                hide-details
                                :label="t('admin-page.audit-filter-action')"
                                type="text"
                                variant="outlined"
                            />
                        </VCol>
                        <VCol cols="12" md="4" lg="2">
                            <VSelect
                                v-model="filters.outcome"
                                density="comfortable"
                                hide-details
                                :items="outcomeOptions"
                                :label="t('admin-page.audit-filter-outcome-all')"
                                variant="outlined"
                            />
                        </VCol>
                        <VCol cols="12" md="4" lg="3">
                            <VTextField
                                v-model="filters.since"
                                density="comfortable"
                                hide-details
                                :label="t('admin-page.audit-filter-since')"
                                type="datetime-local"
                                variant="outlined"
                            />
                        </VCol>
                        <VCol cols="12" md="4" lg="1">
                            <VSelect
                                v-model="filters.limit"
                                density="comfortable"
                                hide-details
                                :items="limitOptions"
                                label="Limit"
                                variant="outlined"
                            />
                        </VCol>
                        <VCol cols="12" md="4" lg="2" class="d-flex flex-wrap ga-2 justify-end">
                            <VBtn type="submit" color="primary" :disabled="props.loading">
                                {{ t('generic.search') }}
                            </VBtn>
                            <VBtn type="button" variant="tonal" @click="handleReset">
                                {{ t('generic.reset') }}
                            </VBtn>
                        </VCol>
                    </VRow>
                </form>
            </VCardText>
        </VCard>

        <div class="text-body-2 text-medium-emphasis mb-4">
            {{
                t('admin-page.audit-showing', {
                    shown: props.auditEvents.length,
                    total: props.total
                })
            }}
        </div>

        <VAlert v-if="props.error" class="mb-4" type="error" variant="tonal">
            {{ props.error }}
        </VAlert>

        <VAlert
            v-else-if="!props.loading && props.auditEvents.length === 0"
            class="mb-4"
            type="info"
            variant="tonal"
        >
            {{ t('generic.no-data') }}
        </VAlert>

        <div v-else-if="props.loading" class="d-flex justify-center py-6">
            <VProgressCircular color="primary" indeterminate />
        </div>

        <VCard v-else rounded="lg" variant="outlined">
            <VTable class="admin-audit-table">
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
                        :class="{ 'text-error': event.outcome === 'failure' }"
                    >
                        <td class="text-no-wrap">{{ formatDate(event.timestamp) }}</td>
                        <td>{{ event.actor_user_id }}</td>
                        <td>
                            <VChip color="secondary" size="small" variant="tonal">
                                {{ event.actor_role }}
                            </VChip>
                        </td>
                        <td>{{ event.action }}</td>
                        <td>
                            <VChip
                                :color="event.outcome === 'success' ? 'success' : 'error'"
                                size="small"
                                variant="tonal"
                            >
                                {{ event.outcome }}
                            </VChip>
                        </td>
                        <td>{{ event.ip ?? '—' }}</td>
                        <td class="text-no-wrap" :title="event.request_id">
                            {{ truncateId(event.request_id) }}
                        </td>
                        <td class="text-no-wrap" :title="event.trace_id">
                            {{ truncateId(event.trace_id) }}
                        </td>
                    </tr>
                </tbody>
            </VTable>
        </VCard>
    </div>
</template>
