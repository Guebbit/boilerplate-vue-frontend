/**
 * @module
 * Calendar days as plain `YYYY-MM-DD` strings — the shape a date input holds and the stats API's
 * `from`/`to` take — and their arithmetic. Pure functions over
 * the browser's own zone: the shop's zone is the server's business, and where the two differ the
 * server's reading of a day wins (the stats answer carries it as `timeZone`).
 */

/**
 * Milliseconds in a day, for whole-day arithmetic on dates that sit at local midnight.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * A `YYYY-MM-DD` string: four-digit year, two-digit month and day.
 */
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a string is a calendar day that exists (`2026-02-30` is not).
 *
 * @param value - Candidate text, possibly empty.
 * @returns `true` for a real `YYYY-MM-DD` day.
 */
export const isCalendarDay = (value: string | undefined): value is string => {
    if (value === undefined || !DAY_PATTERN.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return (
        parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    );
};

/**
 * Spells a date as its local calendar day.
 *
 * @param date - Any instant.
 * @returns The day in the browser's zone, `YYYY-MM-DD`.
 */
export const toCalendarDay = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Local midnight of a calendar day.
 *
 * @param day - A valid `YYYY-MM-DD`.
 * @returns The date at 00:00 local time.
 */
const midnightOf = (day: string): Date => {
    const [year, month, dayOfMonth] = day.split('-').map(Number);
    return new Date(year, month - 1, dayOfMonth);
};

/**
 * Moves a day forward or back by whole days, across month and year ends.
 *
 * @param day - A valid `YYYY-MM-DD`.
 * @param days - How many days to add; negative goes back.
 * @returns The resulting day.
 */
export const addCalendarDays = (day: string, days: number): string => {
    const moved = midnightOf(day);
    // `setDate` rolls over month and year ends, and keeps local midnight through a DST change,
    // which adding `24 * 3600 * 1000` milliseconds would not.
    moved.setDate(moved.getDate() + days);
    return toCalendarDay(moved);
};

/**
 * How many whole days separate two days, `to` counted inclusive.
 *
 * @param from - First day.
 * @param to - Last day.
 * @returns `1` for the same day; `0` or less when `to` precedes `from`.
 */
export const daysInRange = (from: string, to: string): number =>
    // `Math.round`: a DST change makes a day 23 or 25 hours long, so the quotient is not whole.
    Math.round((midnightOf(to).getTime() - midnightOf(from).getTime()) / MILLISECONDS_PER_DAY) + 1;
