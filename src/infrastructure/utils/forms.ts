/**
 * @module
 * Small, shared form-to-wire conversions — currently just the one AUDIT_0924 D17c needs
 * everywhere a merge/PATCH body can clear an optional field: `null` clears it, an omitted field
 * leaves it alone, and `''` is now a 422 rather than a synonym for either. A text input has no
 * concept of `null`, so a form's own emptied string has to become one before it reaches the API.
 */

/**
 * Turns a form field's emptied value into `null`, the wire's own way of clearing an optional
 * field under merge/PATCH semantics (RFC 7396) — an omitted field would instead be read as
 * "leave it alone".
 *
 * Not for a create/PUT body: those request types don't accept `null` on these fields at all,
 * since there is nothing yet to clear — `value || undefined` (omit it) is what those call sites
 * already do.
 *
 * @param value - The form field's current string value.
 * @returns The value unchanged, or `null` when it was emptied.
 */
export const emptyToNull = (value: string): string | null => (value === '' ? null : value);
