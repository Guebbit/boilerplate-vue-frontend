/**
 * @module
 * Single-purpose DOM write, kept isolated from the i18n module's own state so it stays a plain
 * function with no dependency on vue-i18n.
 */

/**
 * Keeps `<html lang>` and `<html dir>` in sync with the active locale.
 *
 * A right-to-left language laid out left-to-right is unreadable, and `dir` is the one switch the
 * whole page follows. Takes the direction as an argument rather than looking it up itself, so this
 * file stays a plain DOM write with no dependency on the i18n module's own state.
 *
 * @param locale - Locale code now active, e.g. `en`.
 * @param direction - Writing direction for that locale.
 */
export const applyHtmlLocaleAttributes = (locale: string, direction: 'ltr' | 'rtl'): void => {
    const html = document.querySelector('html');
    html?.setAttribute('lang', locale);
    html?.setAttribute('dir', direction);
};
