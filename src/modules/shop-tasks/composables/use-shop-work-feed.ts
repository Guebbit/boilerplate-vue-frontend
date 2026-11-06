/**
 * @module
 * Feeds the kernel's work counts for the shell's lifetime: the person who may open any counted
 * screen gets the summary read on the shared triggers, everyone else gets nothing and no request.
 */
import { computed } from 'vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBadgeRefresh } from '@/kernel/use-badge-refresh.ts';
import { clearWorkCounts } from '@/kernel/work-counts.ts';
import { useShopTasksStore } from '../store';

/**
 * Starts the feed: call it once, from the component this module puts in the app bar.
 */
export const useShopWorkFeed = (): void => {
    const session = useSessionStore();
    const store = useShopTasksStore();

    // The same gates as the five screens' routes: holding none of them means no badge to feed.
    const readerId = computed(() =>
        session.can('display', 'Order') ||
        session.can('display', 'Payment') ||
        session.can('read', 'Return') ||
        session.can('read', 'StockLevel')
            ? session.viewer?.id
            : undefined
    );

    useBadgeRefresh({
        readerId,
        read: (forced) => store.loadSummary(forced),
        clear: clearWorkCounts
    });
};
