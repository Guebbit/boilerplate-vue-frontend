/**
 * @module
 * What an edit form does when its save is answered 412: the record changed under it. Says so
 * in place (a warning, not a failure — nothing is wrong with the request, the record moved),
 * offers "reload latest", and never resends the stale edit on its own. Pairs with
 * `useBlockingError` (the message) and the transport's `etag.ts` (what sent the `If-Match`).
 * See docs/theory/request-flow.md#conditional-writes.
 */
import { ref, type Ref } from 'vue';
import { translate } from '@/i18n';
import { isPreconditionFailed } from '@/infrastructure/utils/errors.ts';
import type { UseBlockingErrorReturn } from '@/infrastructure/utils/use-blocking-error.ts';

/**
 * Everything {@link useStaleRecord} returns.
 */
export interface UseStaleRecordReturn {
    /**
     * Whether the last save was refused because the record moved. Drives the "reload latest"
     * button; cleared by {@link reloadLatest} and {@link clear}.
     */
    isStale: Ref<boolean>;
    /**
     * Call first in a save's `.catch`: when the error is a 412 it shows the warning and returns
     * `true`, so the caller stops; otherwise it returns `false` and the caller handles the error.
     *
     * @param error - The rejected value, normally the envelope from `onResponseReject`.
     */
    handle: (error: unknown) => boolean;
    /**
     * Discards the local edit for the server's copy: clears the warning, then re-reads the record
     * (which also refreshes the `ETag` the next save will send).
     */
    reloadLatest: () => Promise<unknown>;
    /**
     * Clears the stale flag, typically right before the workflow's next attempt.
     */
    clear: () => void;
}

/**
 * One edit form's 412 handling.
 *
 * @param blocking - The form's own `useBlockingError()`, whose message slot shows the warning.
 * @param reload - Re-reads the record the form edits, resolving once the form shows the new copy.
 * @returns See {@link UseStaleRecordReturn}.
 */
export const useStaleRecord = (
    blocking: Pick<UseBlockingErrorReturn, 'warn' | 'clear'>,
    reload: () => Promise<unknown>
): UseStaleRecordReturn => {
    /**
     * Whether the last save hit a 412.
     */
    const isStale = ref(false);

    return {
        isStale,
        handle: (error) => {
            if (!isPreconditionFailed(error)) return false;
            isStale.value = true;
            blocking.warn(translate('generic.error-stale-record'));
            return true;
        },
        reloadLatest: () => {
            isStale.value = false;
            blocking.clear();
            return reload();
        },
        clear: () => {
            isStale.value = false;
        }
    };
};
