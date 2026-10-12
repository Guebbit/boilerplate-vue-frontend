/**
 * @module
 * The period a stats page asks about: two calendar days and a bucket size, plus the rules the API
 * enforces on them (a range of at most two years, at most 400 buckets) so the form can say no
 * before a round trip does. Pure functions; "today" is always passed in.
 */
import type { StatsInterval } from '@types';
import { addCalendarDays, daysInRange, isCalendarDay, toCalendarDay } from './calendar.ts';

/**
 * What a stats page holds as its question.
 */
export interface StatsPeriodChoice {
    /** First day, inclusive, `YYYY-MM-DD`. */
    from: string;
    /** Last day, inclusive, `YYYY-MM-DD`. */
    to: string;
    /** The bucket size of every series. */
    interval: StatsInterval;
}

/**
 * Longest range the API answers: two years. A day short of 731 so a leap day never tips it over.
 */
export const MAX_RANGE_DAYS = 730;

/**
 * Most buckets one series may hold, the API's own ceiling.
 */
export const MAX_BUCKETS = 400;

/**
 * Why a period cannot be sent, as a key the form translates.
 */
export type PeriodProblem = 'invalid' | 'reversed' | 'too-long' | 'too-many-buckets';

/**
 * The quick choices beside the date fields.
 */
export type PeriodPreset = 'last-7' | 'last-30' | 'last-90' | 'this-year';

/**
 * Every preset, in the order the buttons show.
 */
export const PERIOD_PRESETS: readonly PeriodPreset[] = [
    'last-7',
    'last-30',
    'last-90',
    'this-year'
];

/**
 * How many buckets a range makes at a given size. A week starts on Monday, so a range can touch
 * one more partial week than its length divided by seven; a month likewise counts each one touched.
 *
 * @param from - First day.
 * @param to - Last day.
 * @param interval - Bucket size.
 * @returns The bucket count, an upper bound for `week`.
 */
export const bucketCount = (from: string, to: string, interval: StatsInterval): number => {
    const days = daysInRange(from, to);
    if (interval === 'day') return days;
    if (interval === 'week') return Math.ceil(days / 7) + 1;
    const [fromYear, fromMonth] = from.split('-').map(Number);
    const [toYear, toMonth] = to.split('-').map(Number);
    return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
};

/**
 * The smallest bucket that keeps a chart readable for a range.
 *
 * @param from - First day.
 * @param to - Last day.
 * @returns `day` up to a month, `week` up to half a year, `month` beyond.
 */
export const autoInterval = (from: string, to: string): StatsInterval => {
    const days = daysInRange(from, to);
    if (days <= 31) return 'day';
    return days <= 183 ? 'week' : 'month';
};

/**
 * Whether a period can be sent as it stands.
 *
 * @param period - The choice to check.
 * @returns The first problem found, or `undefined` when the API will take it.
 */
export const periodProblem = (period: StatsPeriodChoice): PeriodProblem | undefined => {
    if (!isCalendarDay(period.from) || !isCalendarDay(period.to)) return 'invalid';
    const days = daysInRange(period.from, period.to);
    if (days < 1) return 'reversed';
    if (days > MAX_RANGE_DAYS) return 'too-long';
    return bucketCount(period.from, period.to, period.interval) > MAX_BUCKETS
        ? 'too-many-buckets'
        : undefined;
};

/**
 * The period a preset names, ending today.
 *
 * @param preset - Which quick choice.
 * @param today - The current instant, injected so the result is testable.
 * @returns The period, with the bucket size {@link autoInterval} picks for it.
 */
export const presetPeriod = (preset: PeriodPreset, today: Date): StatsPeriodChoice => {
    const to = toCalendarDay(today);
    const days = { 'last-7': 7, 'last-30': 30, 'last-90': 90, 'this-year': 0 }[preset];
    const from =
        preset === 'this-year' ? `${today.getFullYear()}-01-01` : addCalendarDays(to, 1 - days);
    return { from, to, interval: autoInterval(from, to) };
};

/**
 * The period a page opens with: the one its URL carries, if that is valid, else the last 30 days.
 * A link from the dashboard to a product's page carries the period this way.
 *
 * @param query - `from`, `to` and `interval` as they sit in `route.query`; anything else ignored.
 * @param today - The current instant.
 * @returns A period the API will accept.
 */
export const periodFromQuery = (query: Record<string, unknown>, today: Date): StatsPeriodChoice => {
    const fallback = presetPeriod('last-30', today);
    const intervals: readonly string[] = ['day', 'week', 'month'];
    const { from, to, interval } = query;
    if (typeof from !== 'string' || typeof to !== 'string') return fallback;
    const candidate: StatsPeriodChoice = {
        from,
        to,
        interval:
            typeof interval === 'string' && intervals.includes(interval)
                ? (interval as StatsInterval) // narrowed by the includes() above
                : fallback.interval
    };
    return periodProblem(candidate) === undefined ? candidate : fallback;
};
