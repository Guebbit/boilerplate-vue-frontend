/**
 * @module
 * `tour-seen.ts` — the "this browser already showed that tour" record: keyed by account, tour and
 * version, kept in one `localStorage` record, capped, expiring after six months, and harmless
 * when damaged.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { hasSeenTour, markTourSeen, tourSeenKey } from '@/infrastructure/tour-seen.ts';

beforeEach(() => {
    localStorage.clear();
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

    it('reads a damaged record as empty instead of throwing', () => {
        localStorage.setItem('toursSeen', '{not json');

        expect(hasSeenTour('a:one:1')).toBe(false);
        markTourSeen('a:one:1');
        expect(hasSeenTour('a:one:1')).toBe(true);
    });

    it.each([
        ['an object that is not a record', '{"a":1}'],
        ['a record without a time', '{"keys":["a:one:1"]}'],
        ['a record whose keys are not a list', '{"savedAt":1,"keys":"a:one:1"}']
    ])('ignores %s', (_label, raw) => {
        localStorage.setItem('toursSeen', raw);

        expect(hasSeenTour('a:one:1', 2)).toBe(false);
    });

    it('forgets a record six months after its last change, and a change restarts the clock', () => {
        const day = 24 * 60 * 60 * 1000;
        markTourSeen('a:one:1', 0);

        expect(hasSeenTour('a:one:1', 182 * day)).toBe(true);
        expect(hasSeenTour('a:one:1', 184 * day)).toBe(false);

        markTourSeen('a:two:1', 100 * day);

        expect(hasSeenTour('a:one:1', 250 * day)).toBe(true);
    });
});
