import { EMPTY_VALUE } from '@/utils/constants.ts';
import { getCurrentLocale } from '@/utils/i18n.ts';

/**
 * Default numeric formatting options used across detail pages.
 */
const DEFAULT_NUMBER_FORMAT: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
};

/**
 * Default currency formatting options used across detail pages.
 */
const DEFAULT_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
};

const getLocale = () => getCurrentLocale() || undefined;

/**
 * Converts empty strings and nullish values to the shared fallback glyph.
 */
const formatText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : EMPTY_VALUE;

/**
 * Formats ISO date values according to the browser locale.
 */
const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString(getLocale()) : EMPTY_VALUE;

/**
 * Formats numeric values with configurable precision.
 */
const formatNumber = (
    value?: number | null,
    options: Intl.NumberFormatOptions = DEFAULT_NUMBER_FORMAT
) =>
    typeof value === 'number'
        ? new Intl.NumberFormat(getLocale(), options).format(value)
        : EMPTY_VALUE;

/**
 * Formats numeric values as currency with locale-aware separators and symbol.
 */
const formatCurrency = (
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
        return formatNumber(value, options);
    }
};

/**
 * Maps boolean values to localized labels with a null/undefined fallback.
 */
const formatFlag = (value: boolean | null | undefined, trueLabel: string, falseLabel: string) => {
    if (value === undefined || value === null) return EMPTY_VALUE;
    return value ? trueLabel : falseLabel;
};

/**
 * Centralizes display helpers so Product/User/Order detail pages stay consistent.
 */
export const useItemDetailDisplay = () => ({
    formatText,
    formatDateTime,
    formatNumber,
    formatCurrency,
    formatFlag
});
