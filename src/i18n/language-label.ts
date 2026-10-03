/**
 * @module
 * A language's own display name for a picker option, factored out of
 * `AppLanguageSwitcher.vue` so it is a plain function, not a component to mount.
 */
import { localeNativeNames } from './index.ts';

/**
 * The two vue-i18n primitives this needs, kept to a minimal shape so a caller passes its own
 * `useI18n()` straight through without this file importing vue-i18n itself.
 */
export interface Translator {
    t: (key: string) => string;
    te: (key: string) => boolean;
}

/**
 * A language's display name — this app's own translated name (`generic.<code>`, e.g. "italiano"
 * while reading English) when it has one, otherwise a language nobody has translated for THIS
 * build: one the API added at runtime. The manifest's own {@link localeNativeNames} is tried next
 * (the language's name for itself, e.g. "Español"), then the browser's own `Intl.DisplayNames`
 * (best-effort, in the CURRENT viewing language), and the bare code only if both come up empty —
 * the raw dictionary key this used to fall through to.
 *
 * @param code - Locale tag to label, e.g. `es`.
 * @param viewingLocale - The locale the label itself should read in, for `Intl.DisplayNames`.
 * @param translator - `t`/`te` from the caller's own `useI18n()`.
 * @returns The label to show for that language.
 */
export const languageLabel = (
    code: string,
    viewingLocale: string,
    translator: Translator
): string => {
    if (translator.te(`generic.${code}`)) return translator.t(`generic.${code}`);
    if (localeNativeNames[code]) return localeNativeNames[code];
    // Intl.DisplayNames throws for a malformed BCP-47 tag or an unsupported engine, and there is
    // no non-throwing way to check either first; the fallback (the bare code) is exactly as good
    // as a pre-check would have produced.
    // eslint-disable-next-line no-restricted-syntax -- see above, no non-throwing check exists
    try {
        return new Intl.DisplayNames([viewingLocale], { type: 'language' }).of(code) ?? code;
    } catch {
        return code;
    }
};
