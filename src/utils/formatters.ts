import { EMPTY_VALUE } from '@/utils/constants.ts';
import { getCurrentLocale } from '@/utils/i18n.ts';

/**
 * Default currency formatting options used across detail pages.
 */
const DEFAULT_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
};

/**
 * Current locale in the shape the `Intl` APIs expect: an empty locale maps to
 * `undefined` so the runtime falls back to its own default.
 */
const getLocale = () => getCurrentLocale() || undefined;

/**
 * Converts empty strings and nullish values to the shared fallback glyph.
 */
export const formatText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : EMPTY_VALUE;

/**
 * Formats ISO date values according to the browser locale.
 */
export const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString(getLocale()) : EMPTY_VALUE;

/**
 * Formats numeric values as currency with locale-aware separators and symbol.
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
 */
export const formatFlag = (
    value: boolean | null | undefined,
    trueLabel: string,
    falseLabel: string
) => {
    if (value === undefined || value === null) return EMPTY_VALUE;
    return value ? trueLabel : falseLabel;
};
