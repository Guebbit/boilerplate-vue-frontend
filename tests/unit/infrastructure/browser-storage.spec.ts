/**
 * `browser-storage.ts` — the inventory of what the app leaves in a browser: every named item has
 * one row and the translated cells the privacy page shows, and an item tied to a feature the shop
 * did not configure is left out.
 */
import { describe, expect, it } from 'vitest';
import {
    BROWSER_STORAGE_ITEMS,
    BROWSER_STORAGE_NAME,
    browserStorageFor
} from '@/infrastructure/browser-storage.ts';
import en from '@/locales/en.json';
import it_ from '@/locales/it.json';

describe('the inventory', () => {
    it('has one row for every named item, and no name twice', () => {
        const ids = BROWSER_STORAGE_ITEMS.map(({ id }) => id).toSorted();

        expect(ids).toEqual(Object.keys(BROWSER_STORAGE_NAME).toSorted());
        expect(new Set(Object.values(BROWSER_STORAGE_NAME)).size).toBe(ids.length);
    });

    it('lists twelve cookies and eight storage keys', () => {
        const kinds = BROWSER_STORAGE_ITEMS.map(({ kind }) => kind);

        expect(kinds.filter((kind) => kind === 'cookie')).toHaveLength(12);
        expect(kinds.filter((kind) => kind !== 'cookie')).toHaveLength(8);
    });

    it.each([
        ['English', en],
        ['Italian', it_]
    ])('carries a purpose and a lifetime in %s for every row', (_language, dictionary) => {
        for (const { id } of BROWSER_STORAGE_ITEMS) {
            const row = dictionary['browser-storage'].rows[id];

            expect(row.purpose, `${id} purpose`).toBeTruthy();
            expect(row.lifetime, `${id} lifetime`).toBeTruthy();
        }
    });
});

/**
 * The ids of the rows shown under one set of conditions.
 *
 * @param conditions - Which optional features the shop configured.
 * @param conditions.analytics - A consent banner exists.
 * @param conditions.faro - A Faro receiver is configured.
 * @returns The row ids, in display order.
 */
const names = (conditions: { analytics: boolean; faro: boolean }) =>
    browserStorageFor(conditions).map(({ id }) => id);

describe('browserStorageFor', () => {
    it('leaves out the consent cookie, the opt-out key and the crash-report key with no analytics', () => {
        const shown = names({ analytics: false, faro: false });

        expect(shown).not.toContain('analyticsConsent');
        expect(shown).not.toContain('umamiDisabled');
        expect(shown).not.toContain('faroNavigation');
        expect(shown).toContain('session');
    });

    it('adds the Faro key only when a Faro receiver is configured', () => {
        expect(names({ analytics: true, faro: false })).not.toContain('faroNavigation');
        expect(names({ analytics: true, faro: true })).toContain('faroNavigation');
    });

    it('marks the Faro key as needing consent, and every other row as exempt', () => {
        const needing = BROWSER_STORAGE_ITEMS.filter(({ necessity }) => necessity === 'consent');

        expect(needing.map(({ id }) => id)).toEqual(['faroNavigation']);
    });
});
