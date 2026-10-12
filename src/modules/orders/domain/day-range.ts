/**
 * @module
 * A calendar day (`YYYY-MM-DD`, what a date input holds and the URL carries) read as the first or
 * last instant of that day, for the list's `…From` / `…To` filters, which take instants inclusive
 * at both ends. Pure. Days are the browser's own: the stats pages say which zone the shop's days
 * follow, and the two differ only for a viewer far from the shop.
 * See `docs/theory/domain-layer.md`.
 */

/**
 * A `YYYY-MM-DD` string.
 */
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A date at the given local time of a day, or nothing when the text is no real day.
 *
 * @param day - Candidate `YYYY-MM-DD`.
 * @param hours - Local hours.
 * @param minutes - Local minutes.
 * @param seconds - Local seconds.
 * @param milliseconds - Local milliseconds.
 * @returns The date, or `undefined` for `2026-02-30`, `abc` or an empty string.
 */
const atTime = (
    day: string | undefined,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
): Date | undefined => {
    const match = day === undefined ? null : DAY_PATTERN.exec(day);
    if (!match) return undefined;
    const [year, month, dayOfMonth] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, dayOfMonth, hours, minutes, seconds, milliseconds);
    // `Date` rolls an impossible day over to the next month; a day that moved is not that day.
    return date.getMonth() === month - 1 && date.getDate() === dayOfMonth ? date : undefined;
};

/**
 * The first instant of a day: the inclusive lower bound of "from this day".
 *
 * @param day - `YYYY-MM-DD`, possibly empty.
 * @returns An ISO 8601 UTC instant, or `undefined` when there is no such day.
 */
export const startOfDayInstant = (day: string | undefined): string | undefined =>
    atTime(day, 0, 0, 0, 0)?.toISOString();

/**
 * The last millisecond of a day: the inclusive upper bound of "up to this day".
 *
 * @param day - `YYYY-MM-DD`, possibly empty.
 * @returns An ISO 8601 UTC instant, or `undefined` when there is no such day.
 */
export const endOfDayInstant = (day: string | undefined): string | undefined =>
    atTime(day, 23, 59, 59, 999)?.toISOString();
