/**
 * @module
 * Pinia store for the users nav badge alone: one count read. Kept apart from `store.ts` because the
 * badge accessor runs in the shell's entry chunk, and the CRUD store must stay in the users route
 * chunk.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { asPassive } from '@/infrastructure/http/passive.ts';
import { BADGE_FRESH_MS } from '@/kernel/use-badge-refresh.ts';
import { listUsers } from '@api';
import type { User } from '@types';

/**
 * Live accounts flagged for purchase-hold review: the staff badge's count.
 */
export const useUsersBadgeStore = defineStore('users-badge', () => {
    /**
     * The toolkit's REST slice, used only for `fetchAny`: the count is not a record.
     */
    const { fetchAny } = useStructureRestApi<User, string>({
        resourceKey: 'users-badge',
        queryClient
    });

    /**
     * The count the badge wears; `undefined` until read, and after sign-out.
     */
    const reviewTotal = ref<number>();

    /**
     * Reads the count: the total of the list the badge opens, live accounts only (users
     * soft-delete). Passive: the app asks, not the person.
     *
     * @param forced - Skip the freshness window.
     * @returns A promise resolving once the count is kept.
     */
    const loadReviewTotal = (forced = false): Promise<void> =>
        fetchAny(
            // One row is enough: only `meta.totalItems` is read.
            () => listUsers({ pageSize: 1, purchaseHoldReview: true, deleted: false }, asPassive()),
            { key: ['review-total'], staleTime: BADGE_FRESH_MS, forced }
        ).then((page) => {
            if (page) reviewTotal.value = page.meta.totalItems;
        });

    return { reviewTotal, loadReviewTotal };
});
