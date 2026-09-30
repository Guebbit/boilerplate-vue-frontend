/**
 * @module
 * `TwoFactorChallenge.vue`'s own accessibility fix (FA82): the visible ticking countdown is no
 * longer itself a live region — `use-countdown.spec.ts` already proves the announcement logic in
 * isolation, this proves the VIEW is actually wired to it — plus the "back to login" link an
 * expired challenge used to leave nobody without, a disabled submit button its only way forward.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TwoFactorChallenge from '@/modules/account/views/TwoFactorChallenge.vue';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

/** A login-time MFA challenge, its `expiresAt` the one thing each case below controls. */
const challengeExpiring = (expiresAt: string) => ({
    kind: 'mfa' as const,
    challenge: 'claim-check-token',
    expiresAt,
    methods: [{ method: 'email', delivers: true, target: 'a***a@example.com' }],
    defaultMethod: 'email'
});

const mountChallenge = () =>
    mount(TwoFactorChallenge, {
        global: {
            plugins: [vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /><slot name="header" /></div>' } }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

afterEach(() => loadLocale('en'));

describe('TwoFactorChallenge — the countdown', () => {
    it('keeps the visible ticking text out of any live region', () => {
        useTwoFactorStore().beginLoginChallenge(
            challengeExpiring(new Date(Date.now() + 300_000).toISOString()),
            false
        );

        const wrapper = mountChallenge();
        const ticking = wrapper
            .find('[data-test=two-factor-challenge-code]')
            .element.closest('form')
            ?.querySelector('p:not([role])');

        expect(ticking?.textContent).toContain('expires in');
        // The live region is a SEPARATE element, not this one.
        expect(ticking?.getAttribute('role')).toBeNull();
    });

    it('offers a live region distinct from the ticking text', () => {
        useTwoFactorStore().beginLoginChallenge(
            challengeExpiring(new Date(Date.now() + 300_000).toISOString()),
            false
        );

        const status = mountChallenge().find('form [role=status]');

        expect(status.exists()).toBe(true);
    });
});

describe('TwoFactorChallenge — an expired challenge', () => {
    it('disables submission and offers a way back to login, not only a disabled button', () => {
        useTwoFactorStore().beginLoginChallenge(
            challengeExpiring(new Date(Date.now() - 1000).toISOString()),
            false
        );

        const wrapper = mountChallenge();

        expect(
            wrapper.find('[data-test=two-factor-challenge-submit]').attributes('disabled')
        ).toBeDefined();

        const backLink = wrapper.find('a');
        expect(backLink.exists()).toBe(true);
        expect(backLink.text()).toBe('Back to login');
    });

    it('announces the expired state through the live region', () => {
        useTwoFactorStore().beginLoginChallenge(
            challengeExpiring(new Date(Date.now() - 1000).toISOString()),
            false
        );

        const status = mountChallenge().find('form [role=status]');

        expect(status.text()).toContain('expired');
    });
});

describe('TwoFactorChallenge — the way back to login', () => {
    it('is offered while the challenge is still live, not only once it has expired', () => {
        useTwoFactorStore().beginLoginChallenge(
            challengeExpiring(new Date(Date.now() + 300_000).toISOString()),
            false
        );

        expect(
            mountChallenge().find('[data-test=two-factor-challenge-back-to-login]').exists()
        ).toBe(true);
    });

    it('a 429 on a guess is terminal: the challenge is dropped, the reason shown, only login offered', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(
            challengeExpiring(new Date(Date.now() + 300_000).toISOString()),
            false
        );
        vi.spyOn(store, 'submitLoginCode').mockRejectedValue({
            success: false,
            status: 429,
            message: 'Too Many Requests',
            errors: [{ code: 'RATE_LIMITED', message: 'Too many requests' }]
        });
        const wrapper = mountChallenge();

        return wrapper
            .get('[data-test=two-factor-challenge-code] input')
            .setValue('000000')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(store.challenge).toBeUndefined();
                expect(
                    wrapper.find('[data-test=two-factor-challenge-locked-out]').text()
                ).toContain('sign in again');
                expect(wrapper.find('[data-test=two-factor-challenge-submit]').exists()).toBe(
                    false
                );
                expect(
                    wrapper.find('[data-test=two-factor-challenge-back-to-login]').exists()
                ).toBe(true);
            });
    });

    it('a wrong code (422) is not terminal: the form stays for another try', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(
            challengeExpiring(new Date(Date.now() + 300_000).toISOString()),
            false
        );
        vi.spyOn(store, 'submitLoginCode').mockRejectedValue({
            success: false,
            status: 422,
            message: 'Unprocessable Entity',
            errors: [{ code: 'VALIDATION', message: 'That code is wrong.' }]
        });
        const wrapper = mountChallenge();

        return wrapper
            .get('[data-test=two-factor-challenge-code] input')
            .setValue('000000')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(store.challenge).toBeDefined();
                expect(wrapper.find('[data-test=two-factor-challenge-submit]').exists()).toBe(true);
            });
    });
});
