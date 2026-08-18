import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { apiText } from '@/infrastructure/i18n';

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
    return apiText('generic.error-unknown', 'api-errors.unknown');
};

/**
 * Extracts the MACHINE-readable code from a rejected API call.
 *
 * The sibling of `getErrorMessage`, for the other audience: a message is for the user and is
 * translated, a code is for a dashboard and must never be. It reads the same reject envelope
 * `onResponseReject` guarantees — `errors[0].code` when the API answered with the standard shape,
 * the HTTP status when the failure never reached it (a transport error has no code of its own).
 *
 * It exists because an analytics event carrying a translated message groups into one bucket per
 * language, which is a funnel nobody can read.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns The error code, `http_<status>` when there is none, or `unknown`.
 */
export const apiErrorCode = (error: unknown): string => {
    if (!error || typeof error !== 'object') return 'unknown';

    // Only the first issue: a code names one reason, and a form shows the rest field by field.
    const { errors, status } = error as { errors?: unknown; status?: unknown };
    const [first] = Array.isArray(errors) ? errors : [];

    if (first && typeof first === 'object' && 'code' in first && typeof first.code === 'string')
        return first.code;

    // Nothing domain-specific to report, so fall back to the transport's own answer.
    return typeof status === 'number' ? `http_${status}` : 'unknown';
};

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
