/**
 * @module
 * What a record page does when the API says the record is not there, or not for this caller.
 * A 404 or 403 sends the visitor to the shell's Error page — the one "not found" / "forbidden"
 * state the app has — instead of leaving a detail page on its loading placeholders for good.
 * Any other failure stays an ambient toast, as before.
 */
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { absentIs, notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * The Error page's message for an unknown record (`error-page.*` namespace, see
 * `src/app/utils/error-messages.ts` for why only known keys are allowed there).
 */
const NOT_FOUND_MESSAGE = 'error-page.not-found';

/**
 * The Error page's message for a record the caller may not read.
 */
const FORBIDDEN_MESSAGE = 'navigation.error-forbidden';

/**
 * Builds the `onError` a record page hands to its `watch*` call (and to a forced refetch's
 * `catch`). Replaces the current history entry, so Back does not return to the dead page.
 *
 * @returns A handler taking the rejected value: a 404 or 403 redirects to the Error page, anything
 *  else is toasted and reported.
 */
export const useMissingRecord = (): ((error: unknown) => void) => {
    const router = useRouter();
    const { addMessage } = useNotificationsStore();

    return (error) => {
        const status = [404, 403].find((candidate) => absentIs(error, candidate));
        if (status === undefined) {
            notifyErrorMessages(addMessage, error);
            return;
        }
        const { locale } = router.currentRoute.value.params;
        void router.replace({
            name: 'Error',
            params: {
                locale: String(locale),
                status,
                message: status === 404 ? NOT_FOUND_MESSAGE : FORBIDDEN_MESSAGE
            }
        });
    };
};
