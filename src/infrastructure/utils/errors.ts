import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { translate } from '@/infrastructure/i18n';

/**
 * Extracts a human-readable message from any thrown/rejected value.
 *
 * @param error - Unknown value caught in a `catch` block or promise rejection:
 *  a string, an `Error`, or any object exposing a non-empty `message`.
 * @returns The best message found, or a translated "something went wrong" when nothing usable
 *  is available — typically a network failure that produced no response body at all.
 */
const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string' && error) return error;
    if (error instanceof Error && error.message) return error.message;
    // Covers non-Error rejects with a message field, e.g. parsed API error bodies
    // or values thrown across a serialization boundary (workers, JSON RPC).
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message
    )
        return error.message;
    return translate('api-errors.unknown');
};

/**
 * Whether a rejected API call never got an answer at all.
 *
 * The reject envelope `onResponseReject` builds carries the HTTP status whenever the API replied,
 * whatever it replied with. Nothing to carry means nothing replied: the connection dropped, the
 * request never left the browser, or the host is unreachable.
 *
 * It exists because those are the only failures this app reports to analytics. Anything the server
 * answered, the server already recorded — both repos write into one Umami website, so reporting it
 * here too would store one refusal as two rows nothing can tell apart.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when no response was received.
 */
export const isTransportFailure = (error: unknown): boolean =>
    !error ||
    typeof error !== 'object' ||
    typeof (error as { status?: unknown }).status !== 'number';

/**
 * Shows a best-effort message to the user and always reports the real
 * error to the observability logger (Faro), stack included when available.
 *
 * @param addMessage - Sink for the user-facing message, typically a feedback
 *  store action or a toast helper. Its return value is ignored.
 * @param error - The original thrown value, forwarded untouched to Faro.
 */
export const notifyErrorMessages = (
    addMessage: (message: string) => unknown,
    error: unknown
): void => {
    addMessage(getErrorMessage(error));
    useObservabilityStore().captureException(error);
};

/**
 * Where `useStructureFormValidation`'s `revealErrors()` looks for the field to focus after a
 * failed submit.
 *
 * The toolkit defaults to `[aria-invalid="true"]`, which is the right general answer and the
 * wrong one here: `v-input` wraps the native control, and only the *wrapper* carries Vuetify's
 * error class — focus has to land on something focusable inside it. The trailing `[tabindex]`
 * catches non-native inputs (`v-select`) that expose no input/textarea/select of their own.
 *
 * One constant rather than eleven copies: every form passes it as `invalidFieldSelector`.
 */
export const VUETIFY_INVALID_FIELD_SELECTOR =
    '.v-input--error input, .v-input--error textarea, .v-input--error select, .v-input--error [tabindex]';
