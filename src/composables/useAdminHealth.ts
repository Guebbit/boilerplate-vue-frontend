import { ref } from 'vue';
import { adminApi } from '@/utils/api.ts';
import type { AdminHealth } from '@/types/admin.ts';

/**
 * Composable for fetching the admin health summary.
 * Wraps `GET /admin/health`.
 */
export const useAdminHealth = () => {
    const health = ref<AdminHealth | undefined>(undefined);
    const loading = ref(false);
    const error = ref<string | undefined>(undefined);

    const fetchHealth = async () => {
        loading.value = true;
        error.value = undefined;
        try {
            const response = await adminApi.getAdminHealth();
            health.value = response.data ?? undefined;
        } catch {
            error.value = 'Failed to load health data';
        } finally {
            loading.value = false;
        }
    };

    return { health, loading, error, fetchHealth };
};
