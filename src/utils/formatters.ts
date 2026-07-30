import { getCurrentLocale } from '@/utils/i18n.ts';

/**
 * Shared fallback rendered when a display value is empty or unavailable.
 *
 * Configured through `VITE_APP_EMPTY_VALUE` so a deployment can swap the glyph
 * (em dash, `N/A`, ...) without touching the code; falls back to an em dash.
 */
export const EMPTY_VALUE = import.meta.env.VITE_APP_EMPTY_VALUE ?? '—';

/**
 * Default currency formatting options used across detail pages.
 */
const DEFAULT_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
};

/**
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
export const formatText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : EMPTY_VALUE;

/**
 * Formats ISO date values according to the browser locale.
 *
 * @param value - ISO 8601 date/datetime string, possibly nullish.
 * @returns The localized date/time string, or {@link EMPTY_VALUE}.
 */
export const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString(getLocale()) : EMPTY_VALUE;

/**
 * Formats numeric values as currency with locale-aware separators and symbol.
 *
 * @param value - Amount to format; non-numbers yield the fallback glyph.
 * @param currency - ISO 4217 currency code. Defaults to `EUR`.
 * @param options - `Intl.NumberFormat` overrides. Defaults to 2 decimals.
 * @returns The formatted amount, or {@link EMPTY_VALUE} when `value` is not a
 *  number. Unknown currency codes degrade to a plain number format.
 */
export const formatCurrency = (
    value?: number | null,
    currency = 'EUR',
    options: Intl.NumberFormatOptions = DEFAULT_CURRENCY_FORMAT
) => {
    if (typeof value !== 'number') return EMPTY_VALUE;
    try {
        return new Intl.NumberFormat(getLocale(), {
            style: 'currency',
            currency,
            ...options
        }).format(value);
    } catch {
        return new Intl.NumberFormat(getLocale(), options).format(value);
    }
};

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
) => {
    if (value === undefined || value === null) return EMPTY_VALUE;
    return value ? trueLabel : falseLabel;
};
