/**
 * @module
 * Guest analytics consent (FA-D5): unknown / granted / denied, persisted in a first-party cookie
 * the same way `session.ts` persists `isAuth`/`rememberMe` — through `@guebbit/js-toolkit`'s
 * `getCookie`/`setCookie`, already a dependency here, rather than a new one or `localStorage`.
 * Gated entirely behind `VITE_ANALYTICS_GUEST_CONSENT`: `AppAnalyticsConsentBanner` only renders,
 * and `http/interceptors.ts`'s `onRequest` only reads this store, when the build turns it on.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getCookie, setCookie } from '@guebbit/js-toolkit';

/**
 * Name of the first-party cookie holding the visitor's own choice.
 */
const COOKIE_NAME = 'analyticsConsent';

/**
 * How long the choice survives a closed browser — long enough that answering the banner once is
 * the common case, short enough that a stale opt-in does not outlive most people's own memory of
 * having granted it.
 */
const COOKIE_DAYS = 365;

/**
 * A guest's answer to the consent banner, or the absence of one.
 */
export type AnalyticsConsentChoice = 'unknown' | 'granted' | 'denied';

/**
 * Whether this build ships the guest consent banner at all — off by default, so the demo (and any
 * deployment that hasn't decided it needs one) never shows it. `AppAnalyticsConsentBanner.vue` and
 * `http/interceptors.ts`'s `onRequest` both gate on this, so a build with the flag off behaves as
 * if the feature did not exist, whatever an older build's cookie might still say.
 *
 * @returns `true` only when `VITE_ANALYTICS_GUEST_CONSENT` is exactly `'true'`.
 */
export const isAnalyticsGuestConsentEnabled = (): boolean =>
    import.meta.env.VITE_ANALYTICS_GUEST_CONSENT === 'true';

/**
 * Reads the cookie a previous visit may have left, defaulting to `unknown` for anything else — a
 * cookie from a build with a different vocabulary included.
 *
 * @returns The stored choice, or `unknown`.
 */
const readStoredChoice = (): AnalyticsConsentChoice => {
    const value = getCookie(COOKIE_NAME);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
};

/**
 * Writes the choice to the cookie, `; Secure` over HTTPS same as `session.ts`'s own cookies —
 * neither is a credential, but there is no reason to send either over plain HTTP by default.
 *
 * @param choice - The value to persist.
 */
const writeStoredChoice = (choice: Exclude<AnalyticsConsentChoice, 'unknown'>) => {
    setCookie(COOKIE_NAME, choice, {
        days: COOKIE_DAYS,
        path: '/',
        secure: location.protocol === 'https:',
        sameSite: 'Lax'
    });
};

/**
 * The guest consent banner's own state: what was chosen, and the two actions it offers.
 */
export const useAnalyticsConsentStore = defineStore('analyticsConsent', () => {
    /**
     * The current choice — `unknown` until the banner is answered, then whichever button was
     * pressed, restored from the cookie on every fresh load.
     */
    const choice = ref<AnalyticsConsentChoice>(readStoredChoice());

    /**
     * Records that the visitor accepted analytics tracking.
     */
    const grant = () => {
        choice.value = 'granted';
        writeStoredChoice('granted');
    };

    /**
     * Records that the visitor declined analytics tracking.
     */
    const deny = () => {
        choice.value = 'denied';
        writeStoredChoice('denied');
    };

    return { choice, grant, deny };
});
