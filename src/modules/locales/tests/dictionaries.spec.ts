/**
 * @module
 * Unit tests for `flattenDictionary`/`expandEntries`, exercising both conversions directly against
 * plain fixtures — no store, no transport. The only real logic this module owns, and pure, so
 * this is where the edge cases live: arrays folding to numeric keys and back, deep nesting, and
 * the deeper-key-wins rule on data the API should never produce but a test can.
 */
import { describe, expect, it } from 'vitest';
import { flattenDictionary, expandEntries } from '@/modules/locales/dictionaries.ts';

describe('flattenDictionary', () => {
    it('flattens nested objects into dotted rows', () => {
        expect(
            flattenDictionary({ products: { list: { title: 'Catalogue', empty: 'Nothing' } } })
        ).toEqual([
            { key: 'products.list.title', value: 'Catalogue' },
            { key: 'products.list.empty', value: 'Nothing' }
        ]);
    });

    it('flattens arrays to numeric segments, because the static pages keep lists in them', () => {
        expect(flattenDictionary({ faq: ['first', 'second'] })).toEqual([
            { key: 'faq.0', value: 'first' },
            { key: 'faq.1', value: 'second' }
        ]);
    });

    it('answers nothing for an empty dictionary', () => {
        expect(flattenDictionary({})).toEqual([]);
    });
});

describe('expandEntries', () => {
    it('rebuilds the nested tree from dotted rows', () => {
        expect(
            expandEntries([
                { key: 'products.list.title', value: 'Catalogue' },
                { key: 'generic.search', value: 'Search' }
            ])
        ).toEqual({
            products: { list: { title: 'Catalogue' } },
            generic: { search: 'Search' }
        });
    });

    it('folds all-numeric nodes back into arrays, so array messages round-trip', () => {
        expect(
            expandEntries([
                { key: 'faq.0', value: 'first' },
                { key: 'faq.1', value: 'second' }
            ])
        ).toEqual({ faq: ['first', 'second'] });
    });

    it('sorts numeric segments numerically, not lexically', () => {
        expect(
            expandEntries([
                { key: 'list.10', value: 'tenth' },
                { key: 'list.2', value: 'second' }
            ])
        ).toEqual({ list: ['second', 'tenth'] });
    });

    it('keeps a mixed-key node an object', () => {
        expect(
            expandEntries([
                { key: 'node.0', value: 'zero' },
                { key: 'node.name', value: 'named' }
            ])
        ).toEqual({ node: { 0: 'zero', name: 'named' } });
    });

    it('lets the deeper key win a collision the API should have refused', () => {
        expect(
            expandEntries([
                { key: 'products.list', value: 'shallow' },
                { key: 'products.list.title', value: 'deep' }
            ])
        ).toEqual({ products: { list: { title: 'deep' } } });
        // Same outcome in the other insertion order — which one survives must not depend on it.
        expect(
            expandEntries([
                { key: 'products.list.title', value: 'deep' },
                { key: 'products.list', value: 'shallow' }
            ])
        ).toEqual({ products: { list: { title: 'deep' } } });
    });

    it('round-trips a realistic dictionary through both conversions', () => {
        const dictionary = {
            navigation: { 'label-home': 'home', 'label-menu': 'Menu' },
            'static-pages': { faq: ['one', 'two', 'three'] },
            generic: { product: 'product | products' }
        };
        expect(expandEntries(flattenDictionary(dictionary))).toEqual(dictionary);
    });
});
