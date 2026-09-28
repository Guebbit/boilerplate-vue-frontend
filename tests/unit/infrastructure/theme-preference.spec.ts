/**
 * @module
 * `theme-preference.ts`'s cookie round-trip — the same `@guebbit/js-toolkit` mechanism
 * `analytics-consent.ts` uses, and the same reason for it (see that module's own doc).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setCookie, deleteCookie } from '@guebbit/js-toolkit';
import { readThemePreference, writeThemePreference } from '@/infrastructure/theme-preference.ts';

beforeEach(() => {
    // jsdom keeps `document.cookie` for the whole file, not per test — cleared through the same
    // toolkit function the module itself uses, like production code, rather than a raw assignment.
    deleteCookie('themePreference');
});

/** Every cookie jsdom currently holds, as a plain map. */
const cookieJar = () =>
    Object.fromEntries(
        document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    );

describe('readThemePreference', () => {
    it('answers undefined with no cookie on record — nobody has ever toggled the theme', () => {
        expect(readThemePreference()).toBeUndefined();
    });

    it('reads back whichever theme was last written', () => {
        writeThemePreference('dark');

        expect(readThemePreference()).toBe('dark');
    });

    it('treats an unrecognised cookie value as no preference at all', () => {
        // `'system'` is Vuetify's own third state — it is the ABSENCE of this cookie, never a
        // value written into it, so a cookie holding it (a stale build, a hand-edited one) reads
        // the same as no cookie.
        setCookie('themePreference', 'system', { path: '/' });

        expect(readThemePreference()).toBeUndefined();
    });
});

describe('writeThemePreference', () => {
    it('persists light', () => {
        writeThemePreference('light');

        expect(cookieJar().themePreference).toBe('light');
    });

    it('persists dark, overwriting a previous light pin', () => {
        writeThemePreference('light');
        writeThemePreference('dark');

        expect(cookieJar().themePreference).toBe('dark');
    });
});
