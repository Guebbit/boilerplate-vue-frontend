import { ref } from 'vue';
import { adminApi } from '@/utils/api.ts';
import type { AdminMetricsSummary } from '@/types/admin.ts';

/**
 * Composable for fetching the admin metrics summary.
 * Wraps `GET /admin/metrics/summary`.
 */
export const useAdminMetrics = () => {
    const metrics = ref<AdminMetricsSummary | undefined>(undefined);
    const loading = ref(false);
    const error = ref<string | undefined>(undefined);

    const fetchMetrics = async () => {
        loading.value = true;
        error.value = undefined;
        try {
            const response = await adminApi.getAdminMetricsSummary();
            metrics.value = response.data ?? undefined;
        } catch {
            error.value = 'Failed to load metrics data';
        } finally {
            loading.value = false;
        }
    };

    return { metrics, loading, error, fetchMetrics };
};
