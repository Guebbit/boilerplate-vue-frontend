/**
 * @module
 * Shared error-handling leaves: the app's fallback wording bound to the toolkit's message
 * extractor, transport-vs-answered failure classification, and the toast+Faro reporting pair
 * every catch block calls.
 */

import { extractErrorMessage } from '@guebbit/js-toolkit';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { translate } from '@/infrastructure/i18n';

/**
 * The app's fallback wording, bound onto the toolkit's `extractErrorMessage`.
 *
 * The toolkit deliberately returns an empty string when a rejection carries nothing readable —
 * what to say in that case is a decision about tone and language, so it belongs here rather than
 * in a package that does not know which languages this app speaks.
 *
 * @param error - Unknown value caught in a `catch` block or promise rejection.
 * @returns The best message found, otherwise the generic translated "something went wrong".
 */
const getErrorMessage = (error: unknown): string =>
    extractErrorMessage(error, translate('api-errors.unknown'));

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
 * Whether a rejected API call failed with one of the statuses the caller treats as an ANSWER.
 *
 * `GET /payments/by-order/:id` answering 404 means "no intent yet"; `GET /cart/summary` answering
 * 401 means "no cart". Every other status is a failure the caller must not render as absence.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @param statuses - The statuses that mean "nothing there", e.g. `404`.
 * @returns `true` when the API answered with one of them.
 */
export const absentIs = (error: unknown, ...statuses: number[]): boolean =>
    !isTransportFailure(error) && statuses.includes((error as { status: number }).status);

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
