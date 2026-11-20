/**
 * @module
 * The count the users nav entry wears: live accounts flagged for review that nobody has acted on.
 * Read from the users list's own total, for a person who may read users, on the shared badge
 * triggers. It is not in the shop summary: `users` is a foundation module and names no shop code.
 */
import { computed } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBadgeRefresh } from '@/kernel/use-badge-refresh.ts';
import { useUsersBadgeStore } from '../badge-store';

/**
 * Starts the badge for the shell: call it once, from the nav entry's `badge` accessor.
 *
 * @returns The number to wear, or `undefined` while there is nothing to show.
 */
export const useReviewBadge = (): Ref<number | undefined> => {
    const store = useUsersBadgeStore();

    const session = useSessionStore();

    const { reviewTotal } = storeToRefs(store);

    useBadgeRefresh({
        readerId: computed(() => (session.can('read', 'User') ? session.viewer?.id : undefined)),
        read: (forced) => store.loadReviewTotal(forced),
        clear: () => {
            reviewTotal.value = undefined;
        }
    });

    return reviewTotal;
};
