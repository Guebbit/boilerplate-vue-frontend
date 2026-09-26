/**
 * @module
 * Small, shared form-to-wire conversions. `null` clears an optional field under merge/PATCH
 * semantics (RFC 7396), an omitted field leaves it alone, and `''` is a 422 rather than a synonym
 * for either. A text input has no concept of `null`, so a form's own emptied string has to become
 * one before it reaches the API.
 */

/**
 * Turns a form field's emptied value into `null`, the wire's own way of clearing an optional
 * field under merge/PATCH semantics — an omitted field would instead be read as "leave it alone".
 * Passes `undefined` straight through, so a caller with an optional field on its own form does
 * not need its own guard in front of this one.
 *
 * Not for a create/PUT body: those request types don't accept `null` on these fields at all,
 * since there is nothing yet to clear — `value || undefined` (omit it) is what those call sites
 * already do.
 *
 * @param value - The form field's current string value, or `undefined` when the field is itself
 *  optional and unset.
 * @returns The value unchanged, `null` when it was emptied, or `undefined` unchanged.
 */
export const emptyToNull = (value: string | undefined): string | null | undefined =>
    value === undefined ? undefined : value === '' ? null : value;

/**
 * Keeps only `keys` whose value in `patch` is non-null — the "leave the optimistic guess alone"
 * rule for a field that accepts `null` on the wire (clears it) but whose LOCAL, cached shape
 * never holds `null`, only a real value or absence.
 *
 * @param patch - The object carrying the candidate fields, alongside others this ignores.
 * @param keys - Which of `patch`'s own keys are subject to the rule.
 * @returns A fresh object with only the non-null entries among `keys`.
 */
export const omitNulls = <T extends object, TKey extends keyof T>(
    patch: T,
    keys: readonly TKey[]
): Partial<{ [P in TKey]: NonNullable<T[P]> }> =>
    Object.fromEntries(
        keys.filter((key) => patch[key] != null).map((key) => [key, patch[key]])
    ) as Partial<{ [P in TKey]: NonNullable<T[P]> }>;
