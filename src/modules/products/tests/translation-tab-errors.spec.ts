/**
 * `translation-tab-errors.ts` — the per-locale error counts a product form's language tabs badge
 * themselves with. Covers all three exports: the flat-issue bucketer both Zod-error and
 * server-error paths funnel into is only worth trusting once each of its edge cases (a
 * non-translation issue, a malformed server item, the three envelope shapes a rejected write can
 * arrive in) is pinned.
 */
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
    translationTabErrorCounts,
    translationTabErrorCountsFromServerError,
    translationTabErrorCountsFromZodError
} from '../composables/translation-tab-errors';

describe('translationTabErrorCounts', () => {
    it('buckets issues by the locale their path names', () => {
        expect(
            translationTabErrorCounts([
                { path: ['translations', 'it', 'title'], message: 'required' },
                { path: ['translations', 'it', 'description'], message: 'too long' },
                { path: ['translations', 'es', 'title'], message: 'required' }
            ])
        ).toEqual({ it: 2, es: 1 });
    });

    it('ignores an issue with no locale in its path — a whole-body refinement or a top-level field', () => {
        expect(
            translationTabErrorCounts([
                { path: ['price'], message: 'must be positive' },
                { path: [], message: 'at least one translation is required' }
            ])
        ).toEqual({});
    });

    it('ignores a path whose second segment is not a locale string', () => {
        expect(
            translationTabErrorCounts([{ path: ['translations'], message: 'required' }])
        ).toEqual({});
    });

    it('answers an empty object for no issues at all', () => {
        expect(translationTabErrorCounts([])).toEqual({});
    });
});

describe('translationTabErrorCountsFromZodError', () => {
    it("reads a ZodError's own issues through the same bucketing rule", () => {
        const error = new ZodError([
            {
                code: 'custom',
                path: ['translations', 'it', 'title'],
                message: 'required'
            }
        ]);

        expect(translationTabErrorCountsFromZodError(error)).toEqual({ it: 1 });
    });
});

describe('translationTabErrorCountsFromServerError', () => {
    it('reads errors straight off the rejection', () => {
        const error = {
            errors: [{ details: { field: 'translations.it.title' }, message: 'required' }]
        };

        expect(translationTabErrorCountsFromServerError(error)).toEqual({ it: 1 });
    });

    it('reads errors from error.data when the top level has none', () => {
        const error = {
            data: {
                errors: [{ details: { field: 'translations.es.description' }, message: 'too long' }]
            }
        };

        expect(translationTabErrorCountsFromServerError(error)).toEqual({ es: 1 });
    });

    it('reads errors from error.response.data — an axios-shaped rejection', () => {
        const error = {
            response: {
                data: {
                    errors: [{ details: { field: 'translations.it.title' }, message: 'required' }]
                }
            }
        };

        expect(translationTabErrorCountsFromServerError(error)).toEqual({ it: 1 });
    });

    it('ignores a field pointer outside translations.*', () => {
        const error = { errors: [{ details: { field: 'price' }, message: 'must be positive' }] };

        expect(translationTabErrorCountsFromServerError(error)).toEqual({});
    });

    it('ignores an item with no details, or a details.field that is not a string', () => {
        const error = {
            errors: [{ message: 'required' }, { details: { field: 42 }, message: 'required' }]
        };

        expect(translationTabErrorCountsFromServerError(error)).toEqual({});
    });

    it('answers an empty object for a rejection with no errors array anywhere', () => {
        expect(translationTabErrorCountsFromServerError(new Error('network down'))).toEqual({});
        expect(translationTabErrorCountsFromServerError('not even an object')).toEqual({});
        expect(translationTabErrorCountsFromServerError(null)).toEqual({});
    });
});
