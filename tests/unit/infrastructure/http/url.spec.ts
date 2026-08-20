/**
 * URL → pathname normalisation — `src/infrastructure/http/url.ts`.
 *
 * Two consumers match against this: the response-schema table's anchored route patterns and
 * `refresh.ts`'s excluded-paths set. Both are exact-shape comparisons, so every normalisation here
 * — the query string, the leading slash, the absolute-URL case — is the difference between a route
 * being recognised and being silently skipped.
 */

import { describe, expect, it } from 'vitest';
import { toPathname } from '@/infrastructure/http/url';

describe('toPathname', () => {
    it('returns the root path for an undefined url', () => {
        // The health endpoint is `GET /`, so undefined must land there rather than nowhere.
        expect(toPathname(undefined)).toBe('/');
    });

    it('passes a relative path through unchanged', () => {
        expect(toPathname('/products')).toBe('/products');
    });

    it('extracts the pathname from an absolute url', () => {
        expect(toPathname('https://api.example.com/products/42')).toBe('/products/42');
    });

    it('handles an http (not just https) absolute url', () => {
        expect(toPathname('http://localhost:3000/cart/summary')).toBe('/cart/summary');
    });

    it('drops the query string from a relative url', () => {
        // `/products?page=1` must resolve to the same schema as `/products`, or every paginated
        // request goes unvalidated.
        expect(toPathname('/products?page=1&pageSize=20')).toBe('/products');
    });

    it('drops the query string from an absolute url', () => {
        expect(toPathname('https://api.example.com/products?page=1')).toBe('/products');
    });

    it('adds a leading slash to a path that lacks one', () => {
        // Every pattern in the table is anchored with `^\/`, so a path without the slash would
        // match nothing at all.
        expect(toPathname('products')).toBe('/products');
    });
});
