/**
 * @module
 * Pinia store for the shop-tasks module: the one read behind the staff nav badges. It writes the
 * answer into the kernel's work counts (`@/kernel/work-counts`), where the screens' manifests read
 * it, and keeps no copy of its own.
 */
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { BADGE_FRESH_MS } from '@/kernel/use-badge-refresh.ts';
import { asPassive } from '@/infrastructure/http/passive.ts';
import { setWorkCounts } from '@/kernel/work-counts.ts';
import { getShopWorkSummary } from '@api';
import type { ShopWorkSummary } from '@types';

/**
 * The shop's nav badge counts.
 */
export const useShopTasksStore = defineStore('shop-tasks', () => {
    /**
     * The toolkit's REST slice, used only for `fetchAny`: the summary is not a record.
     */
    const { fetchAny } = useStructureRestApi<ShopWorkSummary & { id: string }, string>({
        resourceKey: 'shop-tasks',
        queryClient
    });

    /**
     * Reads the summary and publishes it. Passive: the app asks, not the person, so it must not
     * keep a staff session from idling out.
     *
     * @param forced - Skip the freshness window (the work just changed, or the viewer did).
     * @returns A promise resolving once the counts are published.
     */
    const loadSummary = (forced = false): Promise<void> =>
        fetchAny(() => getShopWorkSummary(asPassive()), {
            // The toolkit's cache identity for this read, and how long it counts as fresh.
            key: ['work-summary'],
            staleTime: BADGE_FRESH_MS,
            forced
        }).then((counts) => {
            if (counts) setWorkCounts(counts);
        });

    return { loadSummary };
});
