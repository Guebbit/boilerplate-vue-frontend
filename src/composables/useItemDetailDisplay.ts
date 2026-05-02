import { EMPTY_VALUE } from '@/utils/constants.ts';

/**
 * Default numeric formatting options used across detail pages.
 */
const DEFAULT_NUMBER_FORMAT: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
};

/**
 * Converts empty strings and nullish values to the shared fallback glyph.
 */
const formatText = (value?: string | null) =>
    value && value.trim().length > 0 ? value : EMPTY_VALUE;

/**
 * Formats ISO date values according to the browser locale.
 */
const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : EMPTY_VALUE;

/**
 * Formats numeric values with configurable precision.
 */
const formatNumber = (
    value?: number | null,
    options: Intl.NumberFormatOptions = DEFAULT_NUMBER_FORMAT
) => (typeof value === 'number' ? new Intl.NumberFormat(undefined, options).format(value) : EMPTY_VALUE);

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
    formatFlag
});
