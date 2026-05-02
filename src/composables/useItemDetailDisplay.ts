/**
 * Default numeric formatting options used across detail pages.
 */
const defaultNumberFormat: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
};

/**
 * Centralizes display helpers so Product/User/Order detail pages stay consistent.
 */
export const useItemDetailDisplay = () => {
    /**
     * Shared fallback used for undefined/empty values.
     */
    const emptyValue = '—';

    /**
     * Converts empty strings and nullish values to the fallback glyph.
     */
    const formatText = (value?: string | null) =>
        value && value.trim().length > 0 ? value : emptyValue;

    /**
     * Formats ISO date values according to the browser locale.
     */
    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : emptyValue;

    /**
     * Formats numeric values with configurable precision.
     */
    const formatNumber = (
        value?: number | null,
        options: Intl.NumberFormatOptions = defaultNumberFormat
    ) => (typeof value === 'number' ? new Intl.NumberFormat(undefined, options).format(value) : emptyValue);

    /**
     * Maps boolean values to localized labels with a null/undefined fallback.
     */
    const formatFlag = (value: boolean | null | undefined, trueLabel: string, falseLabel: string) => {
        if (value === undefined || value === null) return emptyValue;
        return value ? trueLabel : falseLabel;
    };

    return {
        emptyValue,
        formatText,
        formatDateTime,
        formatNumber,
        formatFlag
    };
};
