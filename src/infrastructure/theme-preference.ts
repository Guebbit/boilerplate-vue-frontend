/**
 * @module
 * The visitor's explicit light/dark override, persisted the same way `analytics-consent.ts`
 * persists a guest's consent choice — through `@guebbit/js-toolkit`'s `getCookie`/`setCookie`,
 * already a dependency here, rather than a new one or `localStorage`. Read once by
 * `ui/vuetify/index.ts` to pick the boot theme before the first paint; written back by
 * `AppNavigation.vue`'s toggle.
 */
import { getCookie, setCookie } from '@guebbit/js-toolkit';

/**
 * Name of the first-party cookie holding the visitor's own choice.
 */
const COOKIE_NAME = 'themePreference';

/**
 * How long the choice survives a closed browser — long enough that toggling once is the common
 * case, and there is no "wrong" value to expire out of the way like a stale consent answer.
 */
const COOKIE_DAYS = 365;

/**
 * An explicit light/dark pin. `'system'`, Vuetify's own third state, is never stored: it is the
 * ABSENCE of a cookie, not a value of one.
 */
export type ThemePreference = 'light' | 'dark';

/**
 * Reads the cookie a previous visit may have left.
 *
 * @returns The pinned theme, or `undefined` when the visitor has never toggled one (or a build
 *  with a different vocabulary left something else there).
 */
export const readThemePreference = (): ThemePreference | undefined => {
    const value = getCookie(COOKIE_NAME);
    return value === 'light' || value === 'dark' ? value : undefined;
};

/**
 * Writes the choice to the cookie, `; Secure` over HTTPS same as `session.ts`'s own cookies — not
 * a credential, but there is no reason to send it over plain HTTP by default.
 *
 * @param theme - The value to persist.
 */
export const writeThemePreference = (theme: ThemePreference): void => {
    setCookie(COOKIE_NAME, theme, {
        days: COOKIE_DAYS,
        path: '/',
        secure: location.protocol === 'https:',
        sameSite: 'Lax'
    });
};
