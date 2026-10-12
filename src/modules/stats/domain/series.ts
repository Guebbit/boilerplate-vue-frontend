/**
 * @module
 * Turning API buckets into chart labels. A bucket's `start` is the shop's local midnight as a UTC
 * instant, so it is read back in the shop's own zone (the answer's `period.timeZone`) — in the
 * browser's zone a 00:00 Rome bucket would label as the evening before for a viewer in London.
 */
import type { StatsInterval } from '@types';

/**
 * Labels a bucket's start for an axis.
 *
 * @param start - The bucket's first instant, ISO 8601.
 * @param timeZone - The shop's IANA zone, from the answer's `period`.
 * @param interval - The bucket size: a month shows month and year, anything shorter shows the day.
 * @param locale - The display locale.
 * @returns The short label, e.g. `12 Oct` or `Oct 2026`.
 */
export const bucketLabel = (
    start: string,
    timeZone: string,
    interval: StatsInterval,
    locale: string
): string =>
    // Intl.DateTimeFormat: `timeZone` makes it read the instant as that zone's wall clock.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
    new Intl.DateTimeFormat(
        locale,
        interval === 'month'
            ? { timeZone, month: 'short', year: 'numeric' }
            : { timeZone, day: 'numeric', month: 'short' }
    ).format(new Date(start));
