/**
 * @module
 * The save body sent for the entity-translations editor: a blank field clears, never drops.
 */
import { describe, expect, it } from 'vitest';
import { toMergeTranslationsBody } from '../domain/translation-drafts.ts';

describe('toMergeTranslationsBody', () => {
    it('sends null for a blank field so the stored value is cleared', () => {
        expect(toMergeTranslationsBody({ it: { title: 'Ciao', description: '' } })).toEqual({
            it: { fields: { title: 'Ciao', description: null }, origin: 'human' }
        });
    });

    it('keeps a locale whose every field is blank, as all-null fields', () => {
        expect(toMergeTranslationsBody({ it: { title: '', description: '' } })).toEqual({
            it: { fields: { title: null, description: null }, origin: 'human' }
        });
    });

    it('sends null for a removed locale', () => {
        expect(toMergeTranslationsBody({ it: null })).toEqual({ it: null });
    });
});
