/**
 * @module
 * The three dialog widths the app uses, by name, so a dialog says which tier it is instead of
 * repeating a pixel value. Bound as `:max-width="DIALOG_MAX_WIDTH.form"`. Not a `VDialog` default:
 * some dialogs want another width, and a default would hide which one a site gets.
 */

/**
 * Maximum dialog widths in px. A phone shows every dialog fullscreen, so these apply from `sm` up.
 */
export const DIALOG_MAX_WIDTH = {
    /** A confirmation or a one-question prompt. */
    narrow: 420,
    /** A form of a handful of fields. */
    form: 480,
    /** Content that needs room: a secret, an import, an entry with a long value. */
    wide: 640
} as const;
