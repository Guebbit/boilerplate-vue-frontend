/**
 * @module
 * Locale-bound formatting wrappers: each function binds the toolkit's pure `formatXBase` to this
 * app's active locale and shared empty-value glyph, so a call site never restates either.
 */

import {
    formatDuration,
    formatText as formatTextBase,
    formatDateTime as formatDateTimeBase,
    formatFlag as formatFlagBase
} from '@guebbit/js-toolkit';
import type { StatsInterval } from '@types';
import { getCurrentLocale } from '@/i18n';
import { countryLabel } from '@/i18n/country-label.ts';
import { decimalScale, isDecimal } from './money.ts';
import { runtimeValue } from '@/infrastructure/runtime-config';

/**
 * Shared fallback rendered when a display value is empty or unavailable.
 *
 * Configured through `VITE_APP_EMPTY_VALUE` so a deployment can swap the glyph
 * (em dash, `N/A`, ...) without touching the code; falls back to an em dash.
 */
export const EMPTY_VALUE =
    runtimeValue('APP_EMPTY_VALUE') || import.meta.env.VITE_APP_EMPTY_VALUE || '—';

/*
 * The formatting lives in `@guebbit/js-toolkit`, which is pure: it takes the locale and the
 * fallback glyph as arguments. Everything below binds both to what this app uses, so a call site
 * never restates them and cannot pick a different locale than the rest of the page.
 */

/**
 * Current locale in the shape the `Intl` APIs expect.
 *
 * @returns The active locale tag, or `undefined` so the runtime falls back to its own default.
 */
const getLocale = () => getCurrentLocale() || undefined;

/**
 * The short reference of a record: the last eight characters of its id, the same `#ref` the
 * backend writes in a mail subject, so two records of one kind can be told apart on sight.
 *
 * @param id - The record's id.
 * @returns The id's last eight characters.
 */
export const shortRef = (id: string): string => id.slice(-8);

/**
 * Converts empty strings and nullish values to the shared fallback glyph.
 *
 * @param value - Raw text to display, possibly empty or nullish.
 * @returns The trimmed-non-empty text, or {@link EMPTY_VALUE}.
 */
export const formatText = (value?: string | null) => formatTextBase(value, EMPTY_VALUE);

/**
 * Formats ISO date values according to the active locale.
 *
 * @param value - ISO 8601 date/datetime string, possibly nullish.
 * @returns The localized date/time string, or {@link EMPTY_VALUE}.
 */
export const formatDateTime = (value?: string | null) =>
    formatDateTimeBase(value, { locale: getLocale(), empty: EMPTY_VALUE });

/**
 * The date-only counterpart of {@link formatDateTime}, for table columns where a timestamp is
 * noise.
 *
 * @param value - ISO 8601 date/datetime string, possibly nullish.
 * @returns The localized date string, or {@link EMPTY_VALUE}.
 */
export const formatDate = (value?: string | null) =>
    formatDateTimeBase(value, {
        locale: getLocale(),
        empty: EMPTY_VALUE,
        /**
         * An explicit numeric date rather than `toLocaleDateString()`'s default, which is the
         * same thing but leaves the choice to the runtime.
         */
        format: { year: 'numeric', month: 'numeric', day: 'numeric' }
    });

/**
 * A plain calendar day (`YYYY-MM-DD`: a promise date the server already resolved on the shop's
 * calendar), printed as that same day, numeric and with no time. Read as UTC so the browser's zone
 * can never move it a day; {@link formatDate} would show the day before west of UTC.
 *
 * @param value - A `YYYY-MM-DD` day, possibly nullish.
 * @returns The localized date string, or {@link EMPTY_VALUE}.
 */
export const formatDay = (value?: string | null) =>
    formatDateTimeBase(value, {
        locale: getLocale(),
        empty: EMPTY_VALUE,
        format: { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }
    });

/**
 * A date the server fixed as a UTC calendar day (a withdrawal deadline is the last instant of its
 * UTC day), printed as that same day, the month in words ("5 December 2026"), never a time.
 * {@link formatDate} would use the browser's zone and show the NEXT day east of UTC.
 *
 * @param value - ISO 8601 date/datetime string, possibly nullish.
 * @returns The localized date string, or {@link EMPTY_VALUE}.
 */
export const formatUtcDate = (value?: string | null) =>
    formatDateTimeBase(value, {
        locale: getLocale(),
        empty: EMPTY_VALUE,
        format: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
    });

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
        locale: getLocale(),
        empty: EMPTY_VALUE,
        // `timeZone` makes `Intl.DateTimeFormat` read the instant as that zone's wall clock.
        format:
            interval === 'month'
                ? { timeZone, month: 'short', year: 'numeric' }
                : { timeZone, day: 'numeric', month: 'short' }
    });

/**
 * A currency code `Intl` accepts: three letters (ISO 4217's shape).
 */
const WELL_FORMED_CURRENCY = /^[A-Z]{3}$/i;

/**
 * Formats an API amount (a decimal string) as currency with locale-aware separators and symbol.
 *
 * No default currency: the shop's currency is configurable (`NODE_DEFAULT_CURRENCY`), and every
 * money resource carries its own `currency`, so a call site that forgot to read it is a bug, not a
 * case to paper over with a silent EUR.
 *
 * The places shown are the places the text carries (`"19.90"` shows two, `"1000"` none, `"1.500"`
 * three): the server writes every amount at its currency's own scale, so the FE keeps no table of
 * currencies. `Intl`'s own defaults would round HUF `"19.90"` to `"20"`.
 *
 * @param value - Amount as the API sends it; anything that is not a decimal string yields the
 *  fallback glyph.
 * @param currency - ISO 4217 currency code, from the same resource `value` was read off.
 * @param format - `Intl.NumberFormat` overrides.
 * @returns The formatted amount, or {@link EMPTY_VALUE} when `value` is not a decimal string. Unknown
 *  currency codes degrade to a plain number format.
 */
export const formatCurrency = (
    value: string | null | undefined,
    currency: string,
    format?: Intl.NumberFormatOptions
): string => {
    if (typeof value !== 'string' || !isDecimal(value)) return EMPTY_VALUE;
    const places = decimalScale(value);
    const digits = { minimumFractionDigits: places, maximumFractionDigits: places };
    /**
     * `format` takes the exact decimal text, so no float rounds the amount on the way in.
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/format#using_format_with_a_string
     */
    const exact = value as `${number}`;
    // `Intl` throws a RangeError for a malformed code (not three letters): show the bare number.
    const options: Intl.NumberFormatOptions = WELL_FORMED_CURRENCY.test(currency)
        ? { style: 'currency', currency, ...digits, ...format }
        : { ...digits, ...format };
    return new Intl.NumberFormat(getLocale(), options).format(exact);
};

/**
 * Formats a fraction (`0.055`) as a locale-aware percentage (`5.5%`), rounding instead of
 * truncating to whole points — `Math.round(rate * 100)` would show 5.5% as "6%", losing the digit
 * that actually distinguishes it from a 6% rate.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 *
 * @param rate - The fraction to format; non-numbers yield the fallback glyph.
 * @returns The formatted percentage, or {@link EMPTY_VALUE} when `rate` is not a number.
 */
export const formatPercent = (rate?: number | null) =>
    typeof rate === 'number'
        ? new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(
              rate
          )
        : EMPTY_VALUE;

/**
 * The time of day, in the active locale — the time-only counterpart of {@link formatDateTime}.
 *
 * @param value - ISO 8601 date/datetime string, possibly nullish.
 * @returns The localized time, or {@link EMPTY_VALUE}.
 */
export const formatTime = (value?: string | null) =>
    formatDateTimeBase(value, {
        locale: getLocale(),
        empty: EMPTY_VALUE,
        format: { hour: 'numeric', minute: 'numeric', second: 'numeric' }
    });

/**
 * Bytes as whole megabytes, for display only.
 *
 * The API publishes memory in BYTES because the conversion is lossy — a rounded megabyte cannot
 * express the 400 KB move between two polls that a leak hunter is looking for. Rounding is a
 * presentation decision, so it happens here.
 *
 * @param bytes - The raw counter, possibly unknown.
 * @returns e.g. `42 MB`, or {@link EMPTY_VALUE} when `bytes` is not a number.
 */
export const formatMegabytes = (bytes?: number | null) =>
    typeof bytes === 'number' ? `${Math.round(bytes / 1024 / 1024)} MB` : EMPTY_VALUE;

/**
 * Formats a process uptime in a compact, human form.
 *
 * The toolkit's `formatDuration` renders `0m` for an unknown duration, because a package cannot
 * know what this app shows when a value is missing. Binding {@link EMPTY_VALUE} here is the same
 * move every other formatter in this file makes.
 *
 * @param seconds - Uptime in seconds, possibly unknown.
 * @returns `"2h 15m"`, `"15m"`, or {@link EMPTY_VALUE} when `seconds` is `undefined`.
 */
export const formatUptime = (seconds?: number): string =>
    seconds === undefined ? EMPTY_VALUE : formatDuration(seconds);

/**
 * Maps boolean values to localized labels with a null/undefined fallback.
 *
 * @param value - Flag to translate into a label.
 * @param trueLabel - Localized label used when `value` is `true`.
 * @param falseLabel - Localized label used when `value` is `false`.
 * @returns One of the two labels, or {@link EMPTY_VALUE} when `value` is
 *  `null`/`undefined`.
 */
export const formatFlag = (
    value: boolean | null | undefined,
    trueLabel: string,
    falseLabel: string
) => formatFlagBase(value, trueLabel, falseLabel, EMPTY_VALUE);

/**
 * A country code as its name in the viewing language.
 *
 * @param code - ISO 3166-1 alpha-2 code, e.g. `IT`.
 * @returns The localized name, the bare code when the runtime cannot resolve it, or the empty
 *  string for an absent code.
 */
export const formatCountry = (code?: string | null): string =>
    code ? countryLabel(code, getCurrentLocale() || 'en') : '';

/**
 * The fields a postal address prints on one line. `fullName` is the addressee, when there is one —
 * a frozen order address names a person, the shop's own address does not.
 */
export interface AddressLineParts {
    /** The addressee, printed first when present. */
    fullName?: string;
    /** Street and house number. */
    street: string;
    /** Postal code. */
    zip: string;
    /** Town or city. */
    city: string;
    /** Country as the record carries it (an ISO 3166-1 alpha-2 code); printed as its localized name. */
    country: string;
}

/**
 * A postal address as one line, the way a letter head prints it: `Name, Street, Zip City, Country`,
 * the country as its name in the viewing language.
 *
 * @param address - The address, when there is one.
 * @returns The line, or `undefined` when `address` is absent.
 */
export const formatAddressLine = (address?: AddressLineParts | null) =>
    address
        ? [
              address.fullName,
              address.street,
              `${address.zip} ${address.city}`,
              formatCountry(address.country)
          ]
              .filter(Boolean)
              .join(', ')
        : undefined;
