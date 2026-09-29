/**
 * @module
 * The form → wire step for a product's translations. The contract refuses `''` everywhere, so what
 * matters is the one place a blank field is spelt differently: left out on a create, `null` on a
 * PATCH (RFC 7396 — the only way to clear a field).
 */
import { describe, expect, it } from 'vitest';
import {
    toCreateTranslations,
    toPatchTranslations
} from '@/modules/products/composables/translations-body.ts';

describe('toCreateTranslations', () => {
    it('leaves a blank description out — there is nothing to clear on a new product', () => {
        expect(
            toCreateTranslations({
                en: { title: 'Cozy Bed', description: '' },
                it: { title: 'Cuccia', description: '   ' }
            })
        ).toEqual({ en: { title: 'Cozy Bed' }, it: { title: 'Cuccia' } });
    });

    it('keeps a description that says something', () => {
        expect(toCreateTranslations({ en: { title: 'Cozy Bed', description: 'Soft' } })).toEqual({
            en: { title: 'Cozy Bed', description: 'Soft' }
        });
    });

    it('drops a null locale: a locale that does not exist yet has nothing to delete', () => {
        expect(toCreateTranslations({ en: { title: 'Cozy Bed' }, it: null })).toEqual({
            en: { title: 'Cozy Bed' }
        });
    });
});

describe('toPatchTranslations', () => {
    it('spells a cleared description null, never the empty string', () => {
        expect(toPatchTranslations({ en: { title: 'Cozy Bed', description: '' } })).toEqual({
            en: { title: 'Cozy Bed', description: null }
        });
    });

    it('keeps a description that says something', () => {
        expect(toPatchTranslations({ en: { title: 'Cozy Bed', description: 'Soft' } })).toEqual({
            en: { title: 'Cozy Bed', description: 'Soft' }
        });
    });

    it('keeps a null locale — the PATCH delete signal', () => {
        expect(toPatchTranslations({ en: { title: 'Cozy Bed' }, it: null })).toEqual({
            en: { title: 'Cozy Bed', description: null },
            it: null
        });
    });
});
