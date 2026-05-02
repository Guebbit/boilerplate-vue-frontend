export const useItemDetailDisplay = () => {
    const emptyValue = '—';

    const formatText = (value?: string | null) =>
        value && value.trim().length > 0 ? value : emptyValue;

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : emptyValue;

    const formatNumber = (
        value?: number | null,
        options: Intl.NumberFormatOptions = {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        }
    ) => (typeof value === 'number' ? new Intl.NumberFormat(undefined, options).format(value) : emptyValue);

    const formatFlag = (value: boolean | null | undefined, trueLabel: string, falseLabel: string) => {
        if (value === undefined || value === null) return emptyValue;
        return value ? trueLabel : falseLabel;
    };

    const formatEnumLabel = (value?: string | null) => {
        if (!value) return emptyValue;
        return value
            .split(/[-_\s]+/)
            .filter(Boolean)
            .map((token) => token[0]?.toUpperCase() + token.slice(1))
            .join(' ');
    };

    return {
        emptyValue,
        formatText,
        formatDateTime,
        formatNumber,
        formatFlag,
        formatEnumLabel
    };
};
