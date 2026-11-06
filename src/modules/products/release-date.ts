/**
 * @module
 * The promise-date fields' one spelling: a plain `YYYY-MM-DD` day, the same on the wire and in
 * the `<input type="date">`. The server turns the day into the shop's midnight and back, so the
 * browser's zone never enters; nothing here parses or shifts a date, it only compares strings.
 */

/**
 * Whether saving would change the day at all. Whether a change reaches any buyer is the server's
 * call (`release-date-impact` counts them), so this only spares a preview for a save that left the
 * day alone.
 *
 * @param original - The day as the product holds it now, when it has one.
 * @param next - The input's value; empty or `null` means cleared.
 */
export const isReleaseDateChanged = (
    original: string | null | undefined,
    next: string | null | undefined
): boolean => (original ?? '') !== (next ?? '');

/**
 * A promise day as the PATCH should carry it: only when the field differs from what was loaded.
 * Every other field is resent whole, but a moved day notifies the buyers who already paid, so an
 * untouched one does not travel.
 *
 * @param held - The day the product holds now, when it has one.
 * @param current - The input's value; `clearable` empties it to `null`, the same "no date" as `''`.
 * @returns The wire value (`''` clears it), or `undefined` to leave the field out.
 */
export const dayChange = (
    held: string | null | undefined,
    current: string | null | undefined
): string | undefined => (isReleaseDateChanged(held, current) ? (current ?? '') : undefined);
