/**
 * @module
 * The form ↔ wire step for a product's words: the default language at the top level, the other
 * languages in `translations`, and the one place a blank field is spelt differently (left out on a
 * create, `null` on a PATCH).
 */
import { describe, expect, it } from 'vitest';
import { toCreateFields, toFormTranslations, toPatchFields } from '../translations-body.ts';

describe('toFormTranslations', () => {
    it('puts the stored default text under the default tag, beside the other languages', () => {
        expect(
            toFormTranslations(
                { title: 'Cozy Bed', description: 'Soft' },
                { it: { title: 'Cuccia' } },
                'en'
            )
        ).toEqual({ en: { title: 'Cozy Bed', description: 'Soft' }, it: { title: 'Cuccia' } });
    });

    it('opens no default tab for a record that carries no source', () => {
        expect(toFormTranslations(undefined, { it: { title: 'Cuccia' } }, 'en')).toEqual({
            it: { title: 'Cuccia' }
        });
    });
});

describe('toCreateFields', () => {
    it('sends the default language at the top level and the other languages as translations', () => {
        expect(
            toCreateFields(
                { en: { title: 'Cozy Bed', description: 'Soft' }, it: { title: 'Cuccia' } },
                'en'
            )
        ).toEqual({
            title: 'Cozy Bed',
            description: 'Soft',
            translations: { it: { title: 'Cuccia' } }
        });
    });

    it('leaves a blank description out — there is nothing to clear on a new product', () => {
        expect(
            toCreateFields(
                {
                    en: { title: 'Cozy Bed', description: '' },
                    it: { title: 'Cuccia', description: '   ' }
                },
                'en'
            )
        ).toEqual({ title: 'Cozy Bed', translations: { it: { title: 'Cuccia' } } });
    });

    it('drops a null locale: a locale that does not exist yet has nothing to delete', () => {
        expect(toCreateFields({ en: { title: 'Cozy Bed' }, it: null }, 'en')).toEqual({
            title: 'Cozy Bed',
            translations: {}
        });
    });

    it('never names the default language inside translations', () => {
        expect(toCreateFields({ en: { title: 'Cozy Bed' } }, 'en').translations).toEqual({});
    });
});

describe('toPatchFields', () => {
    it('spells a cleared description null, never the empty string, at both levels', () => {
        expect(
            toPatchFields(
                {
                    en: { title: 'Cozy Bed', description: '' },
                    it: { title: 'Cuccia', description: '' }
                },
                'en'
            )
        ).toEqual({
            title: 'Cozy Bed',
            description: null,
            translations: { it: { title: 'Cuccia', description: null } }
        });
    });

    it('keeps a description that says something', () => {
        expect(toPatchFields({ en: { title: 'Cozy Bed', description: 'Soft' } }, 'en')).toEqual({
            title: 'Cozy Bed',
            description: 'Soft',
            translations: {}
        });
    });

    it('keeps a null locale — the PATCH delete signal — and never sends the default one', () => {
        expect(toPatchFields({ en: { title: 'Cozy Bed' }, it: null }, 'en')).toEqual({
            title: 'Cozy Bed',
            description: null,
            translations: { it: null }
        });
    });
});
