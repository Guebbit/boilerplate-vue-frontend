/**
 * @module
 * `tour-seen.ts` — the "this browser already showed that tour" record: keyed by account, tour and
 * version, kept in one first-party cookie, capped, and harmless when damaged.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteCookie, setCookie } from '@guebbit/js-toolkit';
import { hasSeenTour, markTourSeen, tourSeenKey } from '@/infrastructure/tour-seen.ts';

beforeEach(() => {
    deleteCookie('toursSeen');
});

describe('tourSeenKey', () => {
    it('differs by account, by tour and by version', () => {
        const base = tourSeenKey('a1', 'welcome', 1);
        expect(tourSeenKey('a2', 'welcome', 1)).not.toBe(base);
        expect(tourSeenKey('a1', 'checkout', 1)).not.toBe(base);
        expect(tourSeenKey('a1', 'welcome', 2)).not.toBe(base);
    });

    it('gives a guest a key of their own, never an account id', () => {
        expect(tourSeenKey(undefined, 'welcome', 1)).toBe('guest:welcome:1');
    });
});

describe('markTourSeen / hasSeenTour', () => {
    it('remembers a key across reads, and only that key', () => {
        markTourSeen(tourSeenKey('a1', 'welcome', 1));

        expect(hasSeenTour(tourSeenKey('a1', 'welcome', 1))).toBe(true);
        expect(hasSeenTour(tourSeenKey('a2', 'welcome', 1))).toBe(false);
    });

    it('shows a bumped version once more', () => {
        markTourSeen(tourSeenKey('a1', 'welcome', 1));

        expect(hasSeenTour(tourSeenKey('a1', 'welcome', 2))).toBe(false);
    });

    it('keeps earlier keys when a new one is added, and does not duplicate a repeat', () => {
        markTourSeen('a:one:1');
        markTourSeen('a:two:1');
        markTourSeen('a:one:1');

        expect(hasSeenTour('a:one:1')).toBe(true);
        expect(hasSeenTour('a:two:1')).toBe(true);
    });

    it('drops the oldest keys past the cap', () => {
        for (let index = 0; index < 45; index++) markTourSeen(`a:tour${index}:1`);

        expect(hasSeenTour('a:tour0:1')).toBe(false);
        expect(hasSeenTour('a:tour44:1')).toBe(true);
    });

    it('reads a damaged cookie as empty instead of throwing', () => {
        setCookie('toursSeen', '{not json');

        expect(hasSeenTour('a:one:1')).toBe(false);
        markTourSeen('a:one:1');
        expect(hasSeenTour('a:one:1')).toBe(true);
    });

    it('ignores a cookie that parses to something other than a list', () => {
        setCookie('toursSeen', '{"a":1}');

        expect(hasSeenTour('a:one:1')).toBe(false);
    });
});
