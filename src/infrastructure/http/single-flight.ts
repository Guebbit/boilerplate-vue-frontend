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

/**
 * One gate for a group of actions that must not overlap: while one runs, any other attempt joins
 * it instead of starting. For buttons whose request carries no `Idempotency-Key`, where a second
 * press would otherwise reach the server as a second request and come back as a refusal.
 *
 * @returns A runner taking the action to start; it answers the in-flight promise when one exists.
 */
export const exclusiveRunner = (): (<T>(start: () => Promise<T>) => Promise<T>) => {
    let inFlight: Promise<unknown> | undefined;
    // The joined promise is the first caller's, so its result type is that caller's `T`; a later
    // caller of another type only ever awaits completion.
    return <T>(start: () => Promise<T>) =>
        (inFlight ??= start().finally(() => {
            inFlight = undefined;
        })) as Promise<T>;
};
