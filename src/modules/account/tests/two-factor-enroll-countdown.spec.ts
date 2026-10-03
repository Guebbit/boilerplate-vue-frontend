/**
 * @module
 * `TwoFactorEnroll.vue`'s own accessibility fix: the same live-region split as
 * `two-factor-challenge-view.spec.ts` proves for the login challenge, for a delivered method's
 * setup code — `use-countdown.spec.ts` already proves the shared announcement logic itself.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TwoFactorEnroll from '@/modules/account/components/TwoFactorEnroll.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** Canned response per `METHOD /url` key, set by each test before it acts. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * Mounts the enroll step for the email method, with its setup answer already canned.
 */
const mountEnroll = () => {
    responses = {
        'POST /account/2fa/methods/email/setup': orvalEnvelope({
            method: 'email',
            delivers: true,
            sentTo: 'a***a@example.com',
            resendAfter: 30,
            expiresAt: new Date(Date.now() + 300_000).toISOString()
        })
    };
    setActivePinia(createPinia());
    return mount(TwoFactorEnroll, {
        props: { method: 'email' },
        attachTo: document.body,
        global: { plugins: [vuetify, i18n] }
    });
};

beforeEach(() => {
    document.body.innerHTML = '';
    return loadLocale('en');
});

afterEach(() => loadLocale('en'));

describe('TwoFactorEnroll — the delivered code countdown', () => {
    it('keeps the visible ticking text out of any live region, offering a separate one', () =>
        flushPromises()
            .then(() => mountEnroll())
            .then((wrapper) => flushPromises().then(() => wrapper))
            .then((wrapper) => {
                const ticking = wrapper.find('p.opacity-70:not([role])');
                const status = wrapper.find('[role=status]');

                expect(ticking.exists()).toBe(true);
                expect(ticking.text()).toContain('expires in');
                expect(status.exists()).toBe(true);
            }));
});
