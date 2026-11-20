/**
 * @module
 * When a staff nav badge re-reads its count, written once for every badge that has its own read.
 *
 * Normal read (the read's own freshness window may answer it): the route changes, the tab becomes
 * visible. Forced read: the viewer changes, a staff notice reaches the bell. Sign-out (or losing
 * the right to see the badge) clears the count. No timer: the triggers are the person moving.
 * A failed read keeps the last number and tells the person once, until a read succeeds again.
 */
import { computed, onScopeDispose, watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useInboxNotices } from '@/kernel/inbox-notices.ts';
import { useAmbientError } from '@/infrastructure/utils/use-ambient-error.ts';

/**
 * How long one answer serves every normal read, in ms: a route change or a tab coming back within
 * the minute reuses it. The badges pass it as the read's `staleTime`.
 */
export const BADGE_FRESH_MS = 60_000;

/**
 * What one badge hands the triggers.
 */
export interface BadgeRefreshOptions {
    /**
     * The signed-in person's id while they may see this badge; `undefined` otherwise. Watching the
     * id (not a flag) re-reads when another account takes the tab over with no sign-out between.
     */
    readerId: Ref<string | undefined>;
    /**
     * One read of the count.
     *
     * @param forced - Skip the read's freshness window (a person or a notice just changed the work).
     */
    read: (forced: boolean) => Promise<unknown>;
    /**
     * Forget the count: its reader is gone.
     */
    clear: () => void;
}

/**
 * Staff work notices carry `.staff.` in their code (`notifications.staff.task-opened`,
 * `shop-tasks.staff.low-stock`); a buyer's message does not.
 */
const STAFF_NOTICE_MARKER = '.staff.';

/**
 * Wire the triggers to a badge's read. Call it in `setup` (it reads the route and the bell).
 *
 * @param options - the reader, the read and the clear.
 */
export const useBadgeRefresh = ({ readerId, read, clear }: BadgeRefreshOptions): void => {
    const route = useRoute();

    const notices = useInboxNotices();

    const onAmbientError = useAmbientError();

    /** True once the person was told a read failed; reset by the next success. */
    let warned = false;

    /**
     * One read, failure-safe: the last number stays, the person is told once per outage.
     */
    const refresh = (forced: boolean) => {
        if (readerId.value === undefined) return;
        read(forced)
            .then(() => {
                warned = false;
            })
            .catch((error: unknown) => {
                if (warned) return;
                warned = true;
                onAmbientError(error);
            });
    };

    const staffNoticeCount = computed(
        () => notices.value.filter(({ code }) => code.includes(STAFF_NOTICE_MARKER)).length
    );

    watch(
        readerId,
        (id) => {
            if (id === undefined) clear();
            else refresh(true);
        },
        // `post`: after the session's own per-person reset, so the read lands on a clean store.
        { immediate: true, flush: 'post' }
    );
    watch(
        () => route.path,
        () => {
            refresh(false);
        }
    );
    watch(staffNoticeCount, (now, before) => {
        if (now > before) refresh(true);
    });

    /**
     * A tab that becomes visible has been away; a hidden one has nothing to read.
     */
    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') refresh(false);
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
    document.addEventListener('visibilitychange', onVisibilityChange);
    onScopeDispose(() => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
    });
};
