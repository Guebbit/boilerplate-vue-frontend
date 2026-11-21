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
import { ERROR_CODES } from '@api/error-codes';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { translate } from '@/i18n';

/**
 * The API's own explanation for a refusal, from its problem details (RFC 9457).
 *
 * `errors[0].message` first: the sentence the backend chose for the first failure, already
 * translated. Then `detail`, the translated summary. The `title` is the English status phrase
 * ("Unprocessable Content") and is never shown: reading it is what made every unmapped refusal
 * look the same.
 *
 * @param error - Unknown rejected value, normally the problem from `onResponseReject`.
 * @returns The first non-empty sentence found, or `undefined` when the value carries none.
 */
const firstApiMessage = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const errors: unknown = 'errors' in error ? error.errors : undefined;
    const detail: unknown = 'detail' in error ? error.detail : undefined;
    const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
    const itemMessage: unknown =
        first && typeof first === 'object' && 'message' in first ? first.message : undefined;
    return [itemMessage, detail].find(
        (candidate): candidate is string => typeof candidate === 'string' && candidate !== ''
    );
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
 * Also the `resolveError` a `useAsyncAction` read passes, so a panel shows the server's sentence and
 * keeps its own `fallback` for a rejection that carries nothing.
 *
 * @param error - Unknown value caught in a `catch` block or promise rejection.
 * @param fallback - Wording for a rejection with nothing readable; the generic one by default.
 * @returns The best message found, otherwise the fallback.
 */
export const getErrorMessage = (
    error: unknown,
    fallback: string = translate('api-errors.unknown')
): string => firstApiMessage(error) ?? extractErrorMessage(error, fallback);

/**
 * A rejection the API answered: the reject envelope `onResponseReject` builds, read for the two
 * fields every helper below needs. `errors` is `unknown` because the guard does not look inside it.
 */
interface AnsweredRejection {
    /** The HTTP status the API replied with; never `0`, which marks "no reply". */
    status: number;
    /** The envelope's error list, when the reply carried one. */
    errors?: unknown;
    /**
     * The occurrence id (`urn:uuid:…`) the API's own problem bodies carry. The client's synthesized
     * problems for a bare proxy answer never do.
     */
    instance?: unknown;
}

/**
 * Whether a rejected API call got an answer, whatever the answer was.
 *
 * Checked, not claimed: the one place a rejection's `status` is proved a number, so the helpers
 * below read it without a cast of their own.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when a response arrived.
 */
export const isAnswered = (error: unknown): error is AnsweredRejection =>
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number' &&
    // `onResponseReject` (`http/interceptors.ts`) writes `status: 0` exactly for the case where no
    // `response` arrived at all — never for an answered request.
    error.status !== 0;

/**
 * The code of the first error in an answered rejection's envelope, when it has one.
 *
 * @param error - An answered rejection.
 */
const firstErrorCode = (error: AnsweredRejection): unknown => {
    const first: unknown = Array.isArray(error.errors) ? error.errors[0] : undefined;
    return first && typeof first === 'object' && 'code' in first ? first.code : undefined;
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
export const isTransportFailure = (error: unknown): boolean => !isAnswered(error);

/**
 * Whether a rejected API call failed with one of the statuses the caller treats as an ANSWER.
 *
 * `GET /account/export` answering 404 means "no export to download" (never asked for, deleted or
 * past its retention); a detail read answering 404 means "no such record, or none this caller may see".
 * Every other status is a failure the caller must not render as absence.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @param statuses - The statuses that mean "nothing there", e.g. `404`.
 * @returns `true` when the API answered with one of them.
 */
export const absentIs = (error: unknown, ...statuses: number[]): boolean =>
    isAnswered(error) && statuses.includes(error.status);

/**
 * Whether a rejected API call is safe to retry under the SAME idempotency key.
 *
 * Nothing conclusive happened server-side either way: a transport failure never reached the
 * server at all, and a 5xx means the server itself failed before it could act — in both cases the
 * caller's next attempt is still the SAME attempt, not a new one. A 4xx is different: the
 * server read the request and refused it for a reason that will not go away on its own, so the
 * next click is a genuinely new attempt and needs a fresh key.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the failure carries no server verdict worth treating as final.
 */
export const isRetryableFailure = (error: unknown): boolean =>
    !isAnswered(error) || error.status >= 500;

/**
 * Whether the SAME `Idempotency-Key` should go out again after this failure.
 *
 * Only when the first attempt may still be running or never arrived: a transport failure (no
 * answer at all), or the API's own `409 IDEMPOTENCY_IN_FLIGHT`. Any other answer, a 5xx included,
 * is final for that key: the API stores it and replays it for the retention window, so resending
 * the key would only replay the failure. The caller re-reads what the call was about instead.
 *
 * Not {@link isRetryableFailure}: the cart's checkout still resends its key after a 5xx.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the next attempt is the same attempt.
 */
export const keepsIdempotencyKey = (error: unknown): boolean => {
    if (!isAnswered(error)) return true;
    return error.status === 409 && firstErrorCode(error) === ERROR_CODES.IDEMPOTENCY_IN_FLIGHT;
};

/**
 * Whether a rejected call is a 5xx the API did NOT write: a gateway or proxy gave up (502, 503,
 * 504) and the answer that reached the client carries no problem body of the API's own.
 *
 * It matters for a write that has to be applied once. The API's own 500 is stored under the key and
 * means the call did not take effect; a gateway's 5xx says nothing about it — the server may have
 * applied the call and only the answer was lost. The same key must go out again, so the stored
 * outcome is replayed instead of the write running twice.
 *
 * Read off `instance`, which every problem the API sends carries and the client's own synthesized
 * problems never do. A real app 500 whose request id was never minted reads as a gateway failure:
 * the key is kept, which only costs one replay.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the API itself did not answer, though something did.
 */
export const isGatewayFailure = (error: unknown): boolean =>
    isAnswered(error) && error.status >= 500 && typeof error.instance !== 'string';

/**
 * Whether the API answered `409 IDEMPOTENCY_OUTCOME_UNKNOWN`: a do-not-retry write (refund, ship,
 * stock) whose first attempt began and never reported back. Nothing ran again. The caller re-reads
 * what the call was about, says so, and only a human click sends again, with a new key (which
 * {@link keepsIdempotencyKey} already mints, since this is not `IDEMPOTENCY_IN_FLIGHT`).
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the first attempt's outcome is unknown.
 */
export const isOutcomeUnknown = (error: unknown): boolean => {
    if (!isAnswered(error)) return false;
    return (
        error.status === 409 && firstErrorCode(error) === ERROR_CODES.IDEMPOTENCY_OUTCOME_UNKNOWN
    );
};

/**
 * Whether a rejected API call carries one of the given error codes in its reject envelope.
 *
 * For a refusal that means "the record is not as you read it" (another operator settled the same
 * refund, a payment already moved on): the caller re-reads instead of showing a stale screen.
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @param codes - The `errors[].code` values that count.
 * @returns `true` when the API answered with at least one of them.
 */
export const hasErrorCode = (error: unknown, ...codes: string[]): boolean => {
    if (!isAnswered(error)) return false;
    const { errors } = error;
    return (
        Array.isArray(errors) &&
        errors.some(
            (item: unknown) =>
                !!item &&
                typeof item === 'object' &&
                'code' in item &&
                typeof item.code === 'string' &&
                codes.includes(item.code)
        )
    );
};

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
    isAnswered(error) && error.status === 412;

/**
 * Whether a rejected call was refused because a rate-limit budget ran out (HTTP 429).
 *
 * @param error - Unknown rejected value, normally the envelope from `onResponseReject`.
 * @returns `true` when the API answered 429.
 */
export const isRateLimited = (error: unknown): boolean => isAnswered(error) && error.status === 429;
