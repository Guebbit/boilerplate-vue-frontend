/**
 * @module
 * Guest analytics consent (FA-D5): unknown / granted / denied, persisted in a first-party cookie
 * the same way `session.ts` persists `isAuth`/`rememberMe` — through `@guebbit/js-toolkit`'s
 * `getCookie`/`setCookie`, already a dependency here, rather than a new one or `localStorage`.
 * Gated by Umami being configured (`isAnalyticsConsentEnabled`): the banner, the footer link and
 * `http/interceptors.ts`'s `X-Analytics-Consent` header all follow it. The answer also drives
 * Umami itself: it loads only after `granted`, and a withdrawal silences it.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCookie, setCookie } from '@guebbit/js-toolkit';
import { readUmamiConfig } from '@/infrastructure/observability/config.ts';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

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
 * Whether the app asks for analytics consent at all: exactly when Umami is configured. Without
 * a website id there is no tracker to gate, so no banner, no footer link, no header.
 *
 * @returns `true` when `VITE_UMAMI_WEBSITE_ID` (or its runtime twin) is set.
 */
export const isAnalyticsConsentEnabled = (): boolean => readUmamiConfig() !== undefined;

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
     * Whether the banner was reopened from the "privacy choices" link, so an answered visitor can
     * change their mind (GDPR Art. 7(3): withdrawing is as easy as consenting).
     */
    const reopened = ref(false);

    /**
     * Whether the banner should be on screen: not yet answered, or deliberately reopened.
     */
    const promptOpen = computed(() => choice.value === 'unknown' || reopened.value);

    /**
     * Pushes the current answer to Umami: load it on `granted`, silence it otherwise. Called at
     * boot, on every answer and after a logout (the account's own answer stops applying then).
     */
    const syncTracker = () => {
        useObservabilityStore().setUmamiConsent(choice.value === 'granted');
    };

    /**
     * Records that the visitor accepted analytics tracking.
     */
    const grant = () => {
        choice.value = 'granted';
        reopened.value = false;
        writeStoredChoice('granted');
        syncTracker();
    };

    /**
     * Records that the visitor declined analytics tracking (also the withdrawal path).
     */
    const deny = () => {
        choice.value = 'denied';
        reopened.value = false;
        writeStoredChoice('denied');
        syncTracker();
    };

    /**
     * Shows the banner again, whatever was answered before.
     */
    const reopen = () => {
        reopened.value = true;
    };

    return { choice, promptOpen, grant, deny, reopen, syncTracker };
});
