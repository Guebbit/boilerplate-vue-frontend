import { ref } from 'vue';
import { adminApi } from '@/utils/api.ts';
import type { AuditEventItem, IAdminAuditFilters } from '@/types/admin.ts';

/**
 * Composable for fetching admin audit logs.
 * Wraps `GET /admin/audit`.
 */
export const useAdminAudit = () => {
    const auditEvents = ref<AuditEventItem[]>([]);
    const total = ref(0);
    const loading = ref(false);
    const error = ref<string | undefined>(undefined);

    const fetchAuditLogs = async (filters: IAdminAuditFilters = {}) => {
        loading.value = true;
        error.value = undefined;
        try {
            const response = await adminApi.getAdminAuditLogs(
                filters.actor || undefined,
                filters.action || undefined,
                filters.outcome || undefined,
                filters.since || undefined,
                filters.limit || undefined
            );
            auditEvents.value = response.data?.items ?? [];
            total.value = response.data?.total ?? 0;
        } catch {
            error.value = 'Failed to load audit logs';
        } finally {
            loading.value = false;
        }
    };

    return { auditEvents, total, loading, error, fetchAuditLogs };
};
