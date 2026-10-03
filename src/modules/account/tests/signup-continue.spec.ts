/**
 * @module
 * Mounts the real Signup page and proves where a new account lands: on the page the visitor was
 * reading when the `?continue=` says so ("Sign up" in the app bar carries the same value "Log in"
 * does), on Home when it says nothing, and never off-site — only a single same-origin relative
 * path is followed. The transport is mocked at `orvalMutator`; the breach check the password field
 * queues is cancelled by unmounting, as `signup-antibot.spec.ts` explains.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Signup from '@/modules/account/views/Signup.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * The query the mocked route reports; each case sets it before mounting.
 */
let currentQuery: Record<string, unknown>;

/**
 * Every `router.push` the page made, shared across `useRouter()` calls like the real instance.
 */
const pushSpy = vi.fn();

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: currentQuery }),
    useRouter: () => ({ push: pushSpy })
}));

/**
 * Canned responses, keyed `${METHOD} ${url}`.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                responses[`${config.method} ${config.url}`]
            )
        )
    )
}));

/**
 * A password the shared composition rule accepts.
 */
const VALID_PASSWORD = 'Str0ng!Passw0rd';

/**
 * Mounts the page, fills in a valid form, submits it and settles.
 *
 * @returns A promise resolving once the signup flow has finished.
 */
const signUp = () => {
    const wrapper = mount(Signup, {
        global: {
            plugins: [vuetify, i18n],
            stubs: {
                HumanCheck: { template: '<div />' }
            }
        }
    });
    const passwordFields = wrapper.findAll('input[type=password]');
    return wrapper
        .get('input[type=email]')
        .setValue('ada@example.com')
        .then(() => passwordFields[0].setValue(VALID_PASSWORD))
        .then(() => passwordFields[1].setValue(VALID_PASSWORD))
        .then(() => wrapper.get('[data-test=signup-terms-accepted] input').setValue(true))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises)
        .then(() => wrapper.unmount());
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    currentQuery = {};
    responses = {
        'GET /account/oauth/providers': orvalEnvelope({ providers: [] }),
        'POST /account/signup': orvalEnvelope({
            id: 'u1',
            username: 'ada',
            email: 'ada@example.com'
        })
    };
    return loadLocale('en');
});

describe('Signup — where the new account lands', () => {
    it('goes back to the page named by a same-origin ?continue=', () => {
        currentQuery = { continue: '/en/products/p1' };

        return signUp().then(() => {
            expect(pushSpy).toHaveBeenCalledWith({ path: '/en/products/p1' });
        });
    });

    it('goes to Home when there is no ?continue=', () =>
        signUp().then(() => {
            expect(pushSpy).toHaveBeenCalledTimes(1);
            expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
        }));

    it.each([
        ['a protocol-relative URL', '//evil.example'],
        ['an absolute URL', 'https://evil.example'],
        ['a repeated param', ['/en/cart', '/en/checkout']]
    ])('never follows %s, and lands on Home instead', (_label, value) => {
        currentQuery = { continue: value };

        return signUp().then(() => {
            expect(pushSpy).toHaveBeenCalledTimes(1);
            expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Home' }));
        });
    });
});
