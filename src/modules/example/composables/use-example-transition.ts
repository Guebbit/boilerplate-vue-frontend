/**
 * @module
 * In any module: a composable earns its place by having two callers. This one is "ask the server
 * for an event, say how it went, and re-read when the answer is that someone got there first".
 * Here: the status door, used by the detail and the edit screen.
 * Delete it if: your record has no action door with a 409.
 * See: docs/theory/request-flow.md#conditional-writes
 */
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { absentIs } from '@/infrastructure/utils/errors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useExampleStore, type ExampleEvent } from '../store';

/**
 * The status door for one routed example.
 *
 * A 409 means the move is not open any more (a peer moved it first): the message shows in place
 * and the record is re-read past the cache, so the buttons show what the server now offers. The
 * next PATCH from an open edit form goes out unconditional, because the transport drops a stale
 * `If-Match` on a forced read (`infrastructure/http/etag.ts`).
 *
 * @param id - The routed example's id, read when a move is asked for.
 * @returns `changeStatus`, the blocked-state `error`, and `clearError`.
 */
export const useExampleTransition = (id: () => string | undefined) => {
    const { t } = useI18n();
    const { addMessage } = useNotificationsStore();
    const store = useExampleStore();
    const { message: error, report, clear: clearError } = useBlockingError();

    /**
     * Applies a lifecycle event to the example, toasting a success and blocking in place on a failure.
     *
     * @param event - The event to apply.
     * @returns A promise settling once the move was answered and any re-read finished.
     */
    const changeStatus = (event: ExampleEvent) => {
        const target = id();
        if (!target) return Promise.resolve();
        clearError();
        return store
            .transitionExample(target, event)
            .then(() => {
                addMessage(t('example-target-page.success-status'));
            })
            .catch((error_: unknown) => {
                report(error_);
                if (absentIs(error_, 409)) return store.fetchExample(target, { forced: true });
            });
    };

    return { changeStatus, error, clearError };
};
