import { describe, expect, it } from 'vitest';
import {
    dynamicPrefixesOf,
    leafPathsOf,
    unusedPaths
} from '../../../../scripts/audit/unused-locale-keys/scan';

describe('leafPathsOf', () => {
    it('joins nested keys and treats an array as one leaf', () => {
        expect(leafPathsOf({ a: { b: 'x', c: ['p', 'q'] }, d: 'y' })).toEqual(['a.b', 'a.c', 'd']);
    });
});

describe('dynamicPrefixesOf', () => {
    it('reads a template-literal prefix and a quoted prefix handed to a helper', () => {
        const source = "t(`generic.${code}`); build('order-timeline.by-');";

        expect(dynamicPrefixesOf(source)).toEqual(['generic.', 'order-timeline.by-']);
    });
});

describe('unusedPaths', () => {
    it('keeps a key nothing names, and drops one named literally or under a dynamic prefix', () => {
        const dictionary = { a: { used: 'x', dead: 'y' }, generic: { admin: 'z' } };
        const haystack = "t('a.used')";

        expect(unusedPaths(dictionary, haystack, ['generic.'])).toEqual(['a.dead']);
    });
});
