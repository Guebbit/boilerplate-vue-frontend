/**
 * @module
 * Locale-bound formatting wrappers: each function binds the toolkit's pure `formatXBase` to this
 * app's active locale and shared empty-value glyph, so a call site never restates either.
 */

import {
    formatDuration,
    formatText as formatTextBase,
    formatDateTime as formatDateTimeBase,
    formatCurrency as formatCurrencyBase,
    formatFlag as formatFlagBase
} from '@guebbit/js-toolkit';
import { getCurrentLocale } from '@/i18n';
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
        // An explicit numeric date rather than `toLocaleDateString()`'s default, which is the
        // same thing but leaves the choice to the runtime.
        format: { year: 'numeric', month: 'numeric', day: 'numeric' }
    });

/**
 * Formats numeric values as currency with locale-aware separators and symbol.
 *
 * No default: the shop's currency is configurable (`NODE_DEFAULT_CURRENCY`), and every money
 * resource (`Product`, `Order`, `ShippingMethod`, the cart's `summary`, `Payment`) now carries its
 * own `currency` — a call site that forgot to read it is a bug, not a case to paper over with a
 * silent EUR (FA37).
 *
 * @param value - Amount to format; non-numbers yield the fallback glyph.
 * @param currency - ISO 4217 currency code, from the same resource `value` was read off.
 * @param format - `Intl.NumberFormat` overrides. Defaults to the currency's own decimals (js-toolkit
 *  2.2.1+: none for JPY/KRW, 3 for KWD/BHD, 2 for the common case).
 * @returns The formatted amount, or {@link EMPTY_VALUE} when `value` is not a
 *  number. Unknown currency codes degrade to a plain number format.
 */
export const formatCurrency = (
    value: number | null | undefined,
    currency: string,
    format?: Intl.NumberFormatOptions
) => formatCurrencyBase(value, { currency, format, locale: getLocale(), empty: EMPTY_VALUE });

/**
 * Decimal places a currency's minor unit represents, cached per code — mirrors the backend's own
 * `minorUnitExponent` (`orders/domain/money.ts`) so a price input's `step`/`precision` never
 * disagrees with what the server will actually store. js-toolkit has no such helper of its own.
 * https://tc39.es/ecma402/#sec-currencydigits
 */
const currencyDigitsCache = new Map<string, number>();

/**
 * @param currency - An ISO 4217 currency code.
 * @returns The number of decimal places that currency's minor unit represents; 2 for an
 *  unrecognised code, `Intl`'s own fallback for a style it otherwise can't resolve.
 */
export const currencyDigits = (currency: string): number => {
    const cached = currencyDigitsCache.get(currency);
    if (cached !== undefined) return cached;

    let digits = 2;
    // `Intl.NumberFormat` throws a `RangeError` for a currency code it doesn't recognise, and a
    // malformed or not-yet-typed code from a product form must fall back to 2, not crash the form.
    // eslint-disable-next-line no-restricted-syntax -- contains exactly that RangeError, see above
    try {
        digits =
            new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
                .maximumFractionDigits ?? 2;
    } catch {
        // Stryker disable next-line -- an unrecognised currency code is a form-input edge case,
        // not a branch this suite drives; the fallback above already covers it.
    }

    currencyDigitsCache.set(currency, digits);
    return digits;
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
