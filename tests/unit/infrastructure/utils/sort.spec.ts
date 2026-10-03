/**
 * The client half of the `sort` grammar: the CSV a URL holds, Vuetify's `{ key, order }[]`, and
 * the contract's token list. The server half is `docs/api/sorting.md`.
 */
import { describe, it, expect } from 'vitest';
import {
    csvFromSortBy,
    firstSortOf,
    sortByFromCsv,
    sortFieldsOf,
    sortToken,
    sortTokensOf
} from '@/infrastructure/utils/sort.ts';

/** A sort-token table: each key maps to a wire value. */
const allowed = { a: 'price', b: '-price', c: 'title', d: '-title' } as const;

describe('firstSortOf', () => {
    it.each([
        ['price', { key: 'price', descending: false }],
        ['-price', { key: 'price', descending: true }],
        ['-price,title', { key: 'price', descending: true }],
        [' title ', { key: 'title', descending: false }]
    ])('reads %j', (csv, expected) => {
        expect(firstSortOf(csv)).toEqual(expected);
    });

    it.each([[undefined], [''], ['-'], [',price']])('reads %j as no sort', (csv) => {
        expect(firstSortOf(csv)).toBeUndefined();
    });
});

describe('sortToken', () => {
    it('spells descending with a "-" prefix', () => {
        expect(sortToken({ key: 'price', descending: true })).toBe('-price');
        expect(sortToken({ key: 'price', descending: false })).toBe('price');
    });
});

describe('the table model', () => {
    it('turns a CSV into one Vuetify entry, and none into an empty list', () => {
        expect(sortByFromCsv('-price')).toEqual([{ key: 'price', order: 'desc' }]);
        expect(sortByFromCsv('title')).toEqual([{ key: 'title', order: 'asc' }]);
        expect(sortByFromCsv(undefined)).toEqual([]);
    });

    it('turns a header click back into a token, and a cleared sort into undefined', () => {
        expect(csvFromSortBy([{ key: 'price', order: 'desc' }])).toBe('-price');
        expect(csvFromSortBy([{ key: 'price', order: 'asc' }])).toBe('price');
        expect(csvFromSortBy([])).toBeUndefined();
    });

    it('does not read a boolean order as a direction', () => {
        expect(csvFromSortBy([{ key: 'price', order: true }])).toBeUndefined();
        expect(csvFromSortBy([{ key: 'price' }])).toBeUndefined();
    });
});

describe('sortTokensOf', () => {
    it('keeps a sort whose every token the contract names', () => {
        expect(sortTokensOf('-price,title', allowed)).toEqual(['-price', 'title']);
    });

    it('drops the whole sort when any token is unknown, rather than send what the API refuses', () => {
        expect(sortTokensOf('-price,password', allowed)).toBeUndefined();
        expect(sortTokensOf('nope', allowed)).toBeUndefined();
    });

    it('answers undefined for an absent or blank sort', () => {
        expect(sortTokensOf(undefined, allowed)).toBeUndefined();
        expect(sortTokensOf(' , ', allowed)).toBeUndefined();
    });
});

describe('sortFieldsOf', () => {
    it('lists each field once, without the "-" twin', () => {
        expect(sortFieldsOf(allowed)).toEqual(['price', 'title']);
    });
});
