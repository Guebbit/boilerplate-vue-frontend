/**
 * @module
 * Shared error-handling leaves: the app's fallback wording bound to the toolkit's message
 * extractor, transport-vs-answered failure classification, and `notifyErrorMessages` — the
 * toast+Faro pair an AMBIENT failure (a list refresh, a background poll) calls. `getErrorMessage`
 * is exported for the other pairing, `useBlockingError` (`src/infrastructure/utils/use-blocking-error.ts`), which a BLOCKED
 * workflow (a save, delete, refund or lookup) calls instead: same wording, same Faro report, kept
 * local and rendered through `InlineErrorAlert` rather than toasted. See
 * docs/theory/request-flow.md for which one a given call site should use.
 */

import { extractErrorMessage } from '@guebbit/js-toolkit';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { translate } from '@/i18n';

/**
 * The API's own explanation for a refusal: `errors[0].message` of the reject envelope.
 *
 * The envelope's top-level `message` is only the HTTP phrase ("Unprocessable Entity"); the item in
 * `errors` is the sentence the backend chose, already translated. Reading the phrase instead is
 * what made every unmapped refusal look the same.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns The first error item's non-empty message, or `undefined` when the value carries none.
 */
const firstApiMessage = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const { errors } = error as { errors?: unknown };
    if (!Array.isArray(errors)) return undefined;
    const first: unknown = errors[0];
    if (!first || typeof first !== 'object') return undefined;
    const { message } = first as { message?: unknown };
    return typeof message === 'string' && message ? message : undefined;
};

/**
 * The app's fallback wording, bound onto the toolkit's `extractErrorMessage`.
 *
 * The API's own sentence ({@link firstApiMessage}) wins; the toolkit then reads whatever else the
 * value carries. The toolkit deliberately returns an empty string when a rejection carries nothing
 * readable — what to say in that case is a decision about tone and language, so it belongs here
 * rather than in a package that does not know which languages this app speaks.
 *
 * Exported for `useBlockingError` (`src/infrastructure/utils/use-blocking-error.ts`) — the one other place a caught error
 * becomes this same wording, just kept local instead of toasted.
 *
 * @param error - Unknown value caught in a `catch` block or promise rejection.
 * @returns The best message found, otherwise the generic translated "something went wrong".
 */
export const getErrorMessage = (error: unknown): string =>
    firstApiMessage(error) ?? extractErrorMessage(error, translate('api-errors.unknown'));

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
    typeof (error as { status?: unknown }).status !== 'number' ||
    // `onResponseReject` (`http/interceptors.ts`) writes `status: 0` exactly for this case — no
    // `response` arrived at all — never for an answered request.
    (error as { status: number }).status === 0;

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
 * Whether a rejected API call is safe to retry under the SAME idempotency key.
 *
 * Nothing conclusive happened server-side either way: a transport failure never reached the
 * server at all, and a 5xx means the server itself failed before it could act — in both cases the
 * caller's next attempt is still the SAME attempt, not a new one (B19). A 4xx is different: the
 * server read the request and refused it for a reason that will not go away on its own, so the
 * next click is a genuinely new attempt and needs a fresh key.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the failure carries no server verdict worth treating as final.
 */
export const isRetryableFailure = (error: unknown): boolean =>
    isTransportFailure(error) || (error as { status: number }).status >= 500;

/**
 * Lets an "absent" answer through and rethrows everything else.
 *
 * The rule three stores share: an absence is a value, any other failure is still a failure.
 * Named once so a store cannot quietly lose the `throw` — which is the half that matters, and
 * the half a copied `catch` block drops.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @param statuses - The statuses that mean "nothing there", e.g. `404`.
 * @throws The original error, unchanged, when it is not one of them.
 */
export const rethrowUnlessAbsent = (error: unknown, ...statuses: number[]): void => {
    if (!absentIs(error, ...statuses)) throw error;
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
 * Whether a rejected write was refused because the record changed since the caller loaded it
 * (HTTP 412, the API's `PRECONDITION_FAILED`): the `If-Match` the client sent no longer matches.
 * The answer is to reload the record and reapply the edit — never to resend as is.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the API answered 412.
 */
export const isPreconditionFailed = (error: unknown): boolean =>
    !isTransportFailure(error) && (error as { status: number }).status === 412;

/**
 * Whether a rejected call was refused because a rate-limit budget ran out (HTTP 429).
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the API answered 429.
 */
export const isRateLimited = (error: unknown): boolean =>
    !isTransportFailure(error) && (error as { status: number }).status === 429;
