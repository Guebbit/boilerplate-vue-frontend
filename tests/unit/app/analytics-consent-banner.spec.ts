/**
 * `AppAnalyticsConsentBanner` — its three states: hidden while Umami is unconfigured, shown
 * while the guest's choice is `unknown`, and gone again the moment either button is pressed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import AppAnalyticsConsentBanner from '@/app/components/AppAnalyticsConsentBanner.vue';
import vuetify from '@/ui/vuetify';

/** Stub for the consent store's `grant`. */
const grant = vi.fn();

/** Stub for the consent store's `deny`. */
const deny = vi.fn();

/** Whether the prompt is open, as the mocked store reports it. */
const promptOpen = { value: true };

/** The guest's stored choice, as the mocked store reports it. */
const consentChoice = { value: 'unknown' as 'unknown' | 'granted' | 'denied' };

/** Whether the mocked build flag turns the feature on. */
let flagEnabled = true;

vi.mock('@/infrastructure/analytics-consent.ts', () => ({
    useAnalyticsConsentStore: () => ({
        get choice() {
            return consentChoice.value;
        },
        get promptOpen() {
            return promptOpen.value;
        },
        grant,
        deny
    }),
    isAnalyticsConsentEnabled: () => flagEnabled
}));

/** Whether the mocked build has a Faro receiver configured. */
let faroConfigured = false;

/** Whether the mocked build has a Umami website id configured. */
let umamiConfigured = true;

vi.mock('@/infrastructure/observability/config.ts', () => ({
    readFaroConfig: () => (faroConfigured ? { url: 'http://collector/collect' } : undefined),
    readUmamiConfig: () => (umamiConfigured ? { websiteId: 'site-1' } : undefined)
}));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

/** Mounts the banner with a real Pinia and Vuetify. */
const mountBanner = () =>
    mount(AppAnalyticsConsentBanner, { global: { plugins: [createPinia(), vuetify] } });

beforeEach(() => {
    flagEnabled = true;
    faroConfigured = false;
    umamiConfigured = true;
    consentChoice.value = 'unknown';
    promptOpen.value = true;
    grant.mockReset();
    deny.mockReset();
});

describe('AppAnalyticsConsentBanner', () => {
    it('renders nothing when Umami is not configured, whatever the choice', () => {
        flagEnabled = false;

        expect(mountBanner().find('[data-test="analytics-consent-banner"]').exists()).toBe(false);
    });

    it('says crash reports follow the answer when a Faro receiver is configured', () => {
        faroConfigured = true;

        expect(mountBanner().text()).toContain('analytics-consent.crash-reports');
    });

    it('names the usage statistics only when Umami is configured', () => {
        expect(mountBanner().text()).toContain('analytics-consent.usage');

        umamiConfigured = false;
        faroConfigured = true;
        const faroOnly = mountBanner().text();
        expect(faroOnly).not.toContain('analytics-consent.usage');
        expect(faroOnly).toContain('analytics-consent.crash-reports');
    });

    it('says nothing about crash reports when no Faro receiver is configured', () => {
        expect(mountBanner().text()).not.toContain('analytics-consent.crash-reports');
    });

    it('shows the banner while the choice is unknown', () => {
        expect(mountBanner().find('[data-test="analytics-consent-banner"]').exists()).toBe(true);
    });

    it('shows the banner again for an answered visitor once reopened', () => {
        consentChoice.value = 'granted';
        promptOpen.value = true;

        expect(mountBanner().find('[data-test="analytics-consent-banner"]').exists()).toBe(true);
    });

    it('hides the banner once granted', () => {
        consentChoice.value = 'granted';
        promptOpen.value = false;

        expect(mountBanner().find('[data-test="analytics-consent-banner"]').exists()).toBe(false);
    });

    it('hides the banner once denied', () => {
        consentChoice.value = 'denied';
        promptOpen.value = false;

        expect(mountBanner().find('[data-test="analytics-consent-banner"]').exists()).toBe(false);
    });

    it('Accept calls grant()', () =>
        mountBanner()
            .get('[data-test="analytics-consent-accept"]')
            .trigger('click')
            .then(() => {
                expect(grant).toHaveBeenCalledOnce();
                expect(deny).not.toHaveBeenCalled();
            }));

    it('Decline calls deny()', () =>
        mountBanner()
            .get('[data-test="analytics-consent-decline"]')
            .trigger('click')
            .then(() => {
                expect(deny).toHaveBeenCalledOnce();
                expect(grant).not.toHaveBeenCalled();
            }));

    it('gives Decline the same weight as Accept: one variant, no colour on either', () => {
        const wrapper = mountBanner();
        const decline = wrapper.get('[data-test="analytics-consent-decline"]');
        const accept = wrapper.get('[data-test="analytics-consent-accept"]');

        const looks = (button: typeof decline) =>
            button
                .classes()
                .filter((name) => name.startsWith('v-btn--variant') || name.startsWith('bg-'))
                .toSorted();
        expect(looks(decline)).toEqual(looks(accept));
        expect(looks(accept)).toContain('v-btn--variant-tonal');
        expect(accept.classes()).not.toContain('bg-primary');
    });
});
