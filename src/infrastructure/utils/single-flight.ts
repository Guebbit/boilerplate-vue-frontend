/**
 * @module
 * Drops a repeat call while the first is still unsettled. A confirm-then-write handler needs it
 * on the WHOLE handler: the dialog store queues questions, so two quick presses on the trigger
 * would ask twice, and two answers would write twice. `:disabled="loading"` cannot stop that on
 * its own, because the attribute only changes on the next render.
 */

/**
 * Wraps an async action so a call made while a previous one is still running does nothing.
 *
 * @param action - The handler to guard; its arguments pass straight through.
 * @returns The guarded handler: its result, or `undefined` for a call that was dropped.
 */
export const singleFlight = <TArguments extends unknown[], TResult>(
    action: (...arguments_: TArguments) => Promise<TResult> | undefined
): ((...arguments_: TArguments) => Promise<TResult | undefined> | undefined) => {
    let running = false;
    return (...arguments_) => {
        if (running) return undefined;
        running = true;
        const release = () => {
            running = false;
        };
        const started = action(...arguments_);
        if (!started) {
            release();
            return undefined;
        }
        // finally(): free the guard on success and on failure alike.
        return started.finally(release);
    };
};
