/**
 * @module
 * The stock poll's one rule: what a configured "every N seconds" means. Pure: it reads no
 * environment and starts no timer. The poll is opt-in, so anything that is not a plain positive
 * whole number of seconds means "off", never a guessed default.
 */

/**
 * The longest delay a browser timer honours (a signed 32-bit millisecond count). Past it the timer
 * fires at once, and a poll meant to be rare would hammer the server instead.
 */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Turns the configured poll interval into a timer delay.
 *
 * @param raw - The knob as written (`VITE_CART_STOCK_POLL_SECONDS`), unset or blank included.
 * @returns The delay in milliseconds, or `undefined` for "no polling": unset, `0`, negative,
 *  fractional, not a number, or too long for a timer.
 */
export const stockPollIntervalMs = (raw: string | undefined): number | undefined => {
    const text = raw?.trim();
    // Digits only: `Number` would also accept '0x10', '1e1' and '+5'.
    if (!text || !/^\d+$/.test(text)) return undefined;
    const seconds = Number(text);
    if (!Number.isInteger(seconds) || seconds <= 0) return undefined;
    const ms = seconds * 1000;
    return ms > MAX_TIMER_MS ? undefined : ms;
};
