/**
 * @module
 * The count the inbox's nav entry wears: tasks waiting for someone (unassigned) plus the ones
 * the signed-in person holds. Read from `GET /tasks/summary` when a person who may read tasks
 * appears, and again whenever a task notice reaches the bell, so the number follows the work
 * without polling.
 */
import { computed, watch } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useInboxNotices } from '@/kernel/inbox-notices.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useAmbientError } from '@/infrastructure/utils/use-ambient-error.ts';
import { useTasksStore } from '../store';

/**
 * The prefix of the codes that say a task needs someone (`task-opened`, `task-overdue`,
 * `task-assigned`).
 */
const TASK_NOTICE_PREFIX = 'notifications.staff.task-';

/**
 * How many task notices the bell holds right now. A notice arriving makes the count grow, which
 * is the cue to re-read the summary.
 *
 * @returns A ref to the count of task notices in the bell.
 */
const useTaskNoticeCount = (): Ref<number> => {
    const notices = useInboxNotices();

    return computed(
        () => notices.value.filter(({ code }) => code.startsWith(TASK_NOTICE_PREFIX)).length
    );
};

/**
 * Starts the badge for the shell: call it once, from the nav entry's `badge` accessor.
 *
 * @returns The number to wear, or `undefined` while there is nothing to show.
 */
export const useTaskBadge = (): Ref<number | undefined> => {
    const store = useTasksStore();
    const session = useSessionStore();
    const { summary } = storeToRefs(store);
    const noticeCount = useTaskNoticeCount();
    // A failed read leaves the badge at its last count; the person is told once.
    const onAmbientError = useAmbientError();

    /**
     * Who may read tasks: the person whose count this is. Watching the id (not just "someone")
     * re-reads when another account takes the tab over without a sign-out between.
     */
    const readerId = computed(() =>
        session.isAuth && session.can('read', 'Task') ? session.viewer?.id : undefined
    );

    watch(
        readerId,
        (id) => {
            if (id === undefined) summary.value = undefined;
            else store.loadSummary().catch(onAmbientError);
        },
        // `post`: after the session's own per-person reset, so the read lands on a clean store.
        { immediate: true, flush: 'post' }
    );

    watch(noticeCount, (now, before) => {
        if (readerId.value !== undefined && now > before) store.loadSummary().catch(onAmbientError);
    });

    return computed(() =>
        summary.value ? summary.value.mine + summary.value.unassigned : undefined
    );
};
