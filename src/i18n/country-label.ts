/**
 * @module
 * A country's own localized display name for a picker option — the same idea as
 * `language-label.ts`'s `languageLabel`, for `AddressFormDialog.vue`'s country select.
 */

/**
 * A country's display name, localized in the CURRENT viewing language via the browser's own
 * `Intl.DisplayNames` — no dependency needed (`i18n-iso-countries` was rejected for failing the
 * 12-month maintenance window this repo asks of a dependency).
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames
 *
 * @param code - ISO 3166-1 alpha-2 code to label, e.g. `IT`.
 * @param viewingLocale - The locale the label itself should read in.
 * @returns The localized country name, or the bare code if `Intl.DisplayNames` cannot resolve it
 *  (a malformed tag, or an engine that lacks the data).
 */
export const countryLabel = (code: string, viewingLocale: string): string => {
    // Intl.DisplayNames throws for a malformed BCP-47 tag or an unsupported engine, and there is
    // no non-throwing way to check either first — same reasoning as `languageLabel`.
    // eslint-disable-next-line no-restricted-syntax -- see above, no non-throwing check exists
    try {
        return new Intl.DisplayNames([viewingLocale], { type: 'region' }).of(code) ?? code;
    } catch {
        return code;
    }
};
