/**
 * @module
 * A stats bucket's label on a chart axis, bound to the app's locale and empty-value glyph.
 */
import { formatDateTime as formatDateTimeBase } from '@guebbit/js-toolkit';
import type { StatsInterval } from '@types';
import { getCurrentLocale } from '@/i18n';
import { EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';

/**
 * A stats bucket's start as a short axis label, read in the shop's own zone. A bucket starts at the
 * shop's local midnight as a UTC instant: in the browser's zone a 00:00 Rome bucket would label as
 * the evening before for a viewer in London.
 *
 * @param value - The bucket's first instant, ISO 8601.
 * @param timeZone - The shop's IANA zone, from the stats answer's `period`.
 * @param interval - The bucket size: a month shows month and year, anything shorter shows the day.
 * @returns The short label, e.g. `Oct 12` or `Oct 2026`, or {@link EMPTY_VALUE}.
 */
export const formatBucketStart = (value: string, timeZone: string, interval: StatsInterval) =>
    formatDateTimeBase(value, {
        locale: getCurrentLocale() || undefined,
        empty: EMPTY_VALUE,
        // `timeZone` makes `Intl.DateTimeFormat` read the instant as that zone's wall clock.
        format:
            interval === 'month'
                ? { timeZone, month: 'short', year: 'numeric' }
                : { timeZone, day: 'numeric', month: 'short' }
    });
