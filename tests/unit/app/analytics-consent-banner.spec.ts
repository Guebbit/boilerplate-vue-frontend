/**
 * `AppAnalyticsConsentBanner` — FA-D5's three states: hidden while Umami is unconfigured, shown while
 * while the guest's choice is `unknown`, and gone again the moment either button is pressed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import AppAnalyticsConsentBanner from '@/app/components/AppAnalyticsConsentBanner.vue';
import vuetify from '@/ui/vuetify';

const grant = vi.fn();
const deny = vi.fn();
const promptOpen = { value: true };
const consentChoice = { value: 'unknown' as 'unknown' | 'granted' | 'denied' };
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

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});

const mountBanner = () =>
    mount(AppAnalyticsConsentBanner, { global: { plugins: [createPinia(), vuetify] } });

beforeEach(() => {
    flagEnabled = true;
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
});
