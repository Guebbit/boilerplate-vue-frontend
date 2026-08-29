import type { TranslationDictionaries } from './index.ts';

const isDictionaryNode = (value: unknown): value is TranslationDictionaries =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep merge with the same rule vue-i18n's `mergeLocaleMessage` applies: nested groups combine,
 * anything else is a leaf the later dictionary replaces.
 */
export const mergeDictionaries = (
    base: TranslationDictionaries,
    extra: TranslationDictionaries
): TranslationDictionaries => {
    const merged: TranslationDictionaries = { ...base };
    for (const [key, value] of Object.entries(extra)) {
        const existing = merged[key];
        merged[key] =
            isDictionaryNode(existing) && isDictionaryNode(value)
                ? mergeDictionaries(existing, value)
                : value;
    }
    return merged;
};
