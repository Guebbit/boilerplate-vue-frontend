import { afterEach, describe, expect, it } from 'vitest';
import { localeNativeNames } from '@/i18n';
import { languageLabel } from '@/i18n/language-label.ts';

/**
 * `languageLabel`: a language the API added at runtime, which this build has no
 * `generic.<code>` translation for, used to render as that raw dictionary key in the switcher.
 */
describe('languageLabel', () => {
    afterEach(() => {
        delete localeNativeNames.es;
    });

    it("uses this app's own translated name when one exists", () => {
        expect(
            languageLabel('it', 'en', { te: (key) => key === 'generic.it', t: () => 'italiano' })
        ).toBe('italiano');
    });

    it("falls back to the manifest's native name when nothing is translated", () => {
        localeNativeNames.es = 'Español';

        expect(languageLabel('es', 'en', { te: () => false, t: () => 'generic.es' })).toBe(
            'Español'
        );
    });

    it('falls back further to Intl.DisplayNames when the manifest has no native name either', () => {
        const label = languageLabel('es', 'en', { te: () => false, t: () => 'generic.es' });

        expect(label).not.toBe('generic.es');
        expect(label).toBe(new Intl.DisplayNames(['en'], { type: 'language' }).of('es'));
    });

    it('reads the label in the CURRENT viewing language, not the option being labelled', () => {
        const label = languageLabel('es', 'it', { te: () => false, t: () => 'generic.es' });

        expect(label).toBe(new Intl.DisplayNames(['it'], { type: 'language' }).of('es'));
    });

    it('falls back to the bare code if even Intl.DisplayNames finds nothing', () => {
        expect(languageLabel('made-up-code', 'en', { te: () => false, t: () => '' })).toBe(
            'made-up-code'
        );
    });
});
