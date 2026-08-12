import {
    formatText as formatTextBase,
    formatDateTime as formatDateTimeBase,
    formatCurrency as formatCurrencyBase,
    formatFlag as formatFlagBase
} from '@guebbit/js-toolkit';
import { getCurrentLocale } from '@/infrastructure/i18n.ts';

/**
 * Shared fallback rendered when a display value is empty or unavailable.
 *
 * Configured through `VITE_APP_EMPTY_VALUE` so a deployment can swap the glyph
 * (em dash, `N/A`, ...) without touching the code; falls back to an em dash.
 */
export const EMPTY_VALUE = import.meta.env.VITE_APP_EMPTY_VALUE ?? '—';

/**
 * The formatting itself lives in `@guebbit/js-toolkit`, which is deliberately pure: it takes the
 * locale and the fallback glyph as arguments and reads no ambient state.
 *
 * This module is the app-shaped half of that — it binds both to what this app uses, so a call site
 * never restates them and cannot pick a different locale than the rest of the page. That binding
 * is the only reason these wrappers exist.
 *
 * Current locale in the shape the `Intl` APIs expect.
 *
 * @returns The active locale tag, or `undefined` when none is set so the
 *  runtime falls back to its own default.
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
 * Formats ISO date values as a date alone, in the active app locale.
 *
 * The date-only counterpart of {@link formatDateTime}, for table columns where a timestamp is
 * noise. Both read the app locale rather than the browser's, so a visitor who switched language
 * in-app sees dates in the language they chose.
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
