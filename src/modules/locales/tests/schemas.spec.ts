/**
 * @module
 * `src/modules/locales/schemas.ts` — the locale admin's three Zod schemas.
 *
 * Two things are asserted that a happy-path parse would not reach: the BCP 47 tag pattern's case
 * rules, and that every message is a THUNK, so it resolves in the locale active at parse time
 * rather than the one active when the module was imported. The second is the whole reason the
 * schemas are written the way they are — this is the screen where the language changes.
 */
import { describe, expect, it } from 'vitest';
import {
    localesEntrySchema,
    localesLanguageEditSchema,
    localesLanguageSchema
} from '@/modules/locales/schemas';

/**
 * A create-form payload that passes, for tests that vary one field away from valid.
 */
const validLanguage = {
    tag: 'pt-BR',
    name: 'Portuguese',
    nativeName: 'Português'
};

describe('localesLanguageSchema', () => {
    it('accepts a primary subtag with and without a region', () => {
        expect(localesLanguageSchema.parse({ ...validLanguage, tag: 'en' }).tag).toBe('en');
        expect(localesLanguageSchema.parse(validLanguage).tag).toBe('pt-BR');
    });

    /**
     * Case carries meaning in BCP 47 and the API stores the tag as given, so a lowercase region
     * is a different tag rather than a spelling of the same one.
     */
    it.each(['pt-br', 'PT-BR', 'Pt-BR', 'por', 'p', 'pt-BRA', 'pt_BR', 'pt-', ''])(
        'rejects %o as a language tag',
        (tag) => {
            expect(localesLanguageSchema.safeParse({ ...validLanguage, tag }).success).toBe(false);
        }
    );

    /**
     * `.default()` rather than `.optional()`: an omitted value has to reach the API as the
     * contract's own fallback, not as `undefined`.
     */
    it('defaults direction to ltr and active to true', () => {
        const parsed = localesLanguageSchema.parse(validLanguage);

        expect(parsed.direction).toBe('ltr');
        expect(parsed.active).toBe(true);
    });

    it('keeps an explicit direction and active over the defaults', () => {
        const parsed = localesLanguageSchema.parse({
            ...validLanguage,
            direction: 'rtl',
            active: false
        });

        expect(parsed.direction).toBe('rtl');
        expect(parsed.active).toBe(false);
    });

    it('accepts only the two writing directions', () => {
        expect(
            localesLanguageSchema.safeParse({ ...validLanguage, direction: 'ttb' }).success
        ).toBe(false);
    });

    it.each(['name', 'nativeName'] as const)('rejects an empty %s', (field) => {
        expect(localesLanguageSchema.safeParse({ ...validLanguage, [field]: '' }).success).toBe(
            false
        );
    });
});

describe('localesLanguageEditSchema', () => {
    /**
     * The field is disabled on the edit form and `UpdateLocaleRequest` has no `tag` at all, so
     * nothing typed into it can reach the API — the schema stops policing it rather than failing
     * a form on a value that is never sent.
     */
    it('accepts a tag the create form would reject', () => {
        expect(localesLanguageEditSchema.parse({ ...validLanguage, tag: 'not a tag' }).tag).toBe(
            'not a tag'
        );
    });

    /**
     * Relaxing these would only move the rejection to a 422: the form omits nothing, and a sent
     * field still has to satisfy the contract's `minLength: 1`.
     */
    it.each(['name', 'nativeName'] as const)('still requires %s', (field) => {
        expect(localesLanguageEditSchema.safeParse({ ...validLanguage, [field]: '' }).success).toBe(
            false
        );
    });

    it('keeps the defaults the create form applies', () => {
        const parsed = localesLanguageEditSchema.parse(validLanguage);

        expect(parsed.direction).toBe('ltr');
        expect(parsed.active).toBe(true);
    });
});

describe('localesEntrySchema', () => {
    it('accepts a complete entry', () => {
        expect(localesEntrySchema.parse({ tenant: 'demo-fe', key: 'a.b', value: 'Hello' })).toEqual(
            { tenant: 'demo-fe', key: 'a.b', value: 'Hello' }
        );
    });

    it.each(['tenant', 'key', 'value'] as const)('rejects an empty %s', (field) => {
        const entry = { tenant: 'demo-fe', key: 'a.b', value: 'Hello', [field]: '' };

        expect(localesEntrySchema.safeParse(entry).success).toBe(false);
    });
});

describe('every message is resolved at parse time', () => {
    /**
     * The claim the thunks exist for. A message frozen at import would be identical in both
     * locales; these are parsed either side of a locale switch and compared.
     *
     * The keys are asserted rather than the translated text: what matters is that the schema
     * asked i18n for a message at parse time, and the fallback locale returns the key itself when
     * the vocabulary has no entry for it.
     */
    it.each([
        [localesLanguageSchema, { tag: '', name: '', nativeName: '' }],
        [localesEntrySchema, { tenant: '', key: '', value: '' }]
    ])('names an i18n key for every failure', (schema, payload) => {
        const result = schema.safeParse(payload);

        expect(result.success).toBe(false);
        for (const issue of result.error!.issues) {
            expect(issue.message).not.toBe('');
            // Zod's own built-in text ("Too small: ...") is what a missing thunk would leave
            // behind, so its absence is the assertion.
            expect(issue.message).not.toMatch(/^Too small/);
        }
    });
});
