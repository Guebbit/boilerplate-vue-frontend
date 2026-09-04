/**
 * @module
 * One shared in-flight promise for a de-duplicated async operation — the pattern `refresh.ts`'s
 * token renewal and `step-up.ts`'s reauth prompt both need: two callers arriving while the first
 * attempt is still running must join THAT attempt rather than each starting a new one.
 */

/**
 * Wraps a promise-returning function so concurrent calls share one in-flight promise.
 *
 * @param start - Begins the operation. Called again only once the previous attempt has settled,
 *  successfully or not.
 * @returns A zero-argument function with the same result type as `start`, single-flight.
 */
export const singleFlight = <T>(start: () => Promise<T>): (() => Promise<T>) => {
    let inFlight: Promise<T> | undefined;
    return () => {
        inFlight ??= start().finally(() => {
            inFlight = undefined;
        });
        return inFlight;
    };
};
