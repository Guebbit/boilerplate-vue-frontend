/**
 * @module
 * Shape of every HTTP response envelope the API returns. `ResponseNeutral` carries the fields
 * every envelope has; `ResponseSuccess` and `ResponseReject` narrow it by `success`/`data`/
 * `errors` so a caller can discriminate on the shape rather than a status code.
 */

/**
 * Fields common to every response envelope, regardless of outcome.
 */
export interface ResponseNeutral {
    /**
     * Whether the request succeeded — discriminates {@link ResponseSuccess} from {@link ResponseReject}.
     */
    success: boolean;
    /**
     * HTTP status code returned with the envelope.
     */
    status: number;
    /**
     * Short outcome message.
     */
    message: string;
}

/**
 * Envelope shape for a successful response: `data` may be present, `errors` never is.
 */
export interface ResponseSuccess<T> extends ResponseNeutral {
    // message: "ok"
    /**
     * The endpoint's payload, when it returns one.
     */
    data?: T;
    // Never present on a success envelope.
    errors: never;
}

/**
 * Envelope shape for a rejected response: `data` is never present, `errors` holds the
 * UI-friendly messages.
 */
export interface ResponseReject extends ResponseNeutral {
    // message: Technical error name or code
    /**
     * Always absent on a reject envelope.
     */
    data?: never;
    // UI friendly error message
    errors: string[];
    // Backend correlation identifiers — useful for support/debugging
    requestId?: string;
    traceId?: string;
}
