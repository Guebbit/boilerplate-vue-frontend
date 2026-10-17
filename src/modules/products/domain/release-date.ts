/**
 * @module
 * The release-date field's two spellings: the wire's ISO 8601 instant and the `datetime-local`
 * input's zone-less wall-clock string. Pure; the browser's own zone is the only ambient input,
 * and it is what a person typing a date means.
 */

/**
 * Left-pads a date part to two digits.
 *
 * @param part - A month, day, hour or minute.
 */
const pad = (part: number): string => String(part).padStart(2, '0');

/**
 * An instant as the `datetime-local` input spells it, in the browser's zone, to the minute.
 *
 * @param iso - The wire value, when the product has one.
 * @returns `YYYY-MM-DDTHH:mm`, or `''` for an absent or unreadable value (an empty field).
 */
export const toDateTimeLocal = (iso?: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * The input's value back as the wire's ISO 8601 instant.
 *
 * @param local - The input's value.
 * @returns A UTC date-time, or `''` when the field is empty or unreadable — which the body helper
 *  then spells as `null` (clear) on an edit and leaves out of a create.
 */
export const fromDateTimeLocal = (local?: string | null): string => {
    if (!local) return '';
    // Single-argument `Date` parses a zone-less `YYYY-MM-DDTHH:mm` as local time, per the spec.
    const date = new Date(local);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

/**
 * Whether saving this date would push a date that exists later, or take it away: the only moves
 * that tell the buyers who already paid. A product that had no date has no one to tell.
 *
 * @param originalIso - The date as the product holds it now, when it has one.
 * @param nextLocal - The input's value; empty or `null` means cleared.
 */
export const isReleaseDateSlip = (
    originalIso: string | null | undefined,
    nextLocal: string | null | undefined
): boolean => {
    const original = originalIso ? new Date(originalIso) : undefined;
    if (!original || Number.isNaN(original.getTime())) return false;
    const next = fromDateTimeLocal(nextLocal);
    return next === '' || new Date(next).getTime() > original.getTime();
};
