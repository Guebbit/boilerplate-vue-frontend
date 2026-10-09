/**
 * @module
 * Guest analytics consent: unknown / granted / denied, persisted in a first-party cookie
 * the same way `session.ts` persists `isAuth`/`rememberMe` — through `@guebbit/js-toolkit`'s
 * `getCookie`/`setCookie`, already a dependency here, rather than a new one or `localStorage`.
 * Gated by Umami or Faro being configured (`isAnalyticsConsentEnabled`): the banner, the footer link
 * and `http/interceptors.ts`'s `X-Analytics-Consent` header all follow it. The answer also drives
 * Umami (it loads only after `granted`, a withdrawal silences it), Faro's measurement
 * instrumentations, and the browsing events the page reports to the backend (`trackBrowsing`).
 *
 * While signed in the account's own answer is the effective one (`accountChoice`), the banner
 * opens only when that answer is unknown, and the buttons write the account (the profile store
 * listens to `grant`/`deny`) instead of the guest cookie. See `docs/tools/umami.md#consent`.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getCookie, setCookie } from '@guebbit/js-toolkit';
import { readFaroConfig, readUmamiConfig } from '@/infrastructure/observability/config.ts';
import { createAnalyticsEvent } from '@api';
import type { AnalyticsEventRequest } from '@types';
import { logger } from '@/infrastructure/utils/logger.ts';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

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
 * Whether the app asks for analytics consent at all: when Umami or Faro is configured. With
 * neither there is nothing to gate, so no banner, no footer link, no header.
 *
 * @returns `true` when a Umami website id or a Faro receiver URL (or a runtime twin) is set.
 */
export const isAnalyticsConsentEnabled = (): boolean =>
    readUmamiConfig() !== undefined || readFaroConfig() !== undefined;

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
    // js-toolkit `setCookie(name, value, options)`: `days` = lifetime, `path: '/'` = site-wide,
    // `sameSite: 'Lax'` = sent on top-level navigations only. `secure` follows the page's protocol.
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
     * The signed-in account's own answer, or `undefined` while signed out or never asked. Pushed
     * in by the profile store; it outranks the guest cookie for as long as it is defined.
     */
    const accountChoice = ref<boolean | undefined>();

    /**
     * The answer that applies right now: the account's when it holds one, else the cookie's.
     */
    const effective = computed<AnalyticsConsentChoice>(() => {
        if (accountChoice.value === undefined) return choice.value;
        return accountChoice.value ? 'granted' : 'denied';
    });

    /**
     * Records the account's answer (`undefined` clears it, e.g. on sign-out).
     *
     * @param value - The account's `analyticsConsent`, or `undefined` for no answer.
     */
    const setAccountChoice = (value: boolean | undefined) => {
        accountChoice.value = value;
    };

    /**
     * Whether the banner was reopened from the "privacy choices" link, so an answered visitor can
     * change their mind (GDPR Art. 7(3): withdrawing is as easy as consenting).
     */
    const reopened = ref(false);

    /**
     * Whether the banner should be on screen: not yet answered, or deliberately reopened.
     */
    const promptOpen = computed(() => effective.value === 'unknown' || reopened.value);

    /**
     * Pushes the current answer to the trackers: Umami loads on `granted` and is silenced
     * otherwise, and Faro's measurement follows. Called at boot, on every answer and after a
     * logout (the account's own answer stops applying then).
     */
    const syncTracker = () => {
        const observability = useObservabilityStore();
        const granted = effective.value === 'granted';
        observability.setUmamiConsent(granted);
        observability.setFaroConsent(granted);
    };

    /**
     * Reports one browsing event (a product viewed, a search made) to the backend's relay, so the
     * cached reads the server never sees still count.
     *
     * Nothing is sent, and nothing queued, until the visitor has agreed. A failed send is logged
     * and dropped: a lost page view must never cost the visitor anything.
     *
     * @param event - One event from the contract's closed set.
     */
    const trackBrowsing = (event: AnalyticsEventRequest): void => {
        if (!isAnalyticsConsentEnabled() || effective.value !== 'granted') return;

        createAnalyticsEvent(event).catch((error: unknown) => {
            logger.debug('observability', '[Analytics] browsing event not sent', error);
        });
    };

    /**
     * Writes the guest cookie, unless the answer belongs to the account: while a session is
     * active (or the account already holds an answer) the profile store persists it instead.
     *
     * @param value - The button's answer.
     */
    const recordGuestChoice = (value: Exclude<AnalyticsConsentChoice, 'unknown'>) => {
        if (accountChoice.value !== undefined || useSessionStore().isAuth) return;
        choice.value = value;
        writeStoredChoice(value);
    };

    /**
     * Records that the visitor accepted analytics tracking.
     */
    const grant = () => {
        reopened.value = false;
        recordGuestChoice('granted');
        syncTracker();
    };

    /**
     * Records that the visitor declined analytics tracking (also the withdrawal path).
     */
    const deny = () => {
        reopened.value = false;
        recordGuestChoice('denied');
        syncTracker();
    };

    /**
     * Shows the banner again, whatever was answered before.
     */
    const reopen = () => {
        reopened.value = true;
    };

    return {
        choice,
        effective,
        promptOpen,
        grant,
        deny,
        reopen,
        syncTracker,
        trackBrowsing,
        setAccountChoice
    };
});
