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
import { getCurrentLocale } from '@/infrastructure/i18n';

/**
 * Shared fallback rendered when a display value is empty or unavailable.
 *
 * Configured through `VITE_APP_EMPTY_VALUE` so a deployment can swap the glyph
 * (em dash, `N/A`, ...) without touching the code; falls back to an em dash.
 */
export const EMPTY_VALUE = import.meta.env.VITE_APP_EMPTY_VALUE ?? '—';

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
 * @param value - Amount to format; non-numbers yield the fallback glyph.
 * @param currency - ISO 4217 currency code. Defaults to `EUR`.
 * @param format - `Intl.NumberFormat` overrides. Defaults to 2 decimals.
 * @returns The formatted amount, or {@link EMPTY_VALUE} when `value` is not a
 *  number. Unknown currency codes degrade to a plain number format.
 */
export const formatCurrency = (
    value?: number | null,
    currency = 'EUR',
    format?: Intl.NumberFormatOptions
) => formatCurrencyBase(value, { currency, format, locale: getLocale(), empty: EMPTY_VALUE });

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
