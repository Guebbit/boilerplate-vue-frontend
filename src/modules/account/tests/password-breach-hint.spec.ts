/**
 * @module
 * Mounts the three real forms `usePasswordBreachCheck` is wired into, proving the WIRING rather
 * than the debounce itself — `use-password-breach-check.spec.ts` already pins the composable's own
 * behaviour in isolation. Fake timers throughout, same reason as that file: the delay is real, a
 * wait for it would make this suite slow and flaky.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Signup from '@/modules/account/views/Signup.vue';
import PasswordResetConfirm from '@/modules/account/views/PasswordResetConfirm.vue';
import ProfilePasswordChange from '@/modules/account/components/ProfilePasswordChange.vue';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const DELAY = 500;

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Responses per endpoint. `POST /account/password/check` is the one every case here overwrites.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/** How many times the check endpoint was actually called. */
const checkCallCount = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter((call) => (call[0] as { url: string }).url === '/account/password/check')
        .length;

/** Mounts the live-password-change component, no router needed. */
const mountPasswordChangeForm = () =>
    mount(ProfilePasswordChange, { global: { plugins: [vuetify, i18n] } });

/** Mounts the public reset-confirm page. */
const mountPasswordResetPage = () =>
    mount(PasswordResetConfirm, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });

/** Mounts the signup page. */
const mountSignupPage = () =>
    mount(Signup, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                // `RouterLink` targets app-level static-page routes this test's module-only
                // router never registers — irrelevant to the breach hint under test.
                RouterLink: true,
                // Antibot's own config fetch and branching are `human-check.spec.ts`'s job; a
                // real mount here would need `GET /antibot/config` mocked for no reason this
                // suite cares about.
                HumanCheck: true
            }
        }
    });

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    responses = { 'POST /account/password/check': orvalEnvelope({ breached: false }) };
    return loadLocale('en');
});

afterEach(() => {
    vi.useRealTimers();
});

describe('ProfilePasswordChange', () => {
    it('shows the warning once the debounce settles on a breached password', () => {
        responses['POST /account/password/check'] = orvalEnvelope({ breached: true });
        const wrapper = mountPasswordChangeForm();

        return wrapper
            .get('[data-test=toggle-change-password]')
            .trigger('click')
            .then(() => wrapper.get('[data-test=new-password] input').setValue('password1'))
            .then(() => vi.advanceTimersByTimeAsync(DELAY))
            .then(flushPromises)
            .then(() => {
                expect(checkCallCount()).toBe(1);
                expect(wrapper.find('[data-test=password-breach-warning]').exists()).toBe(true);
            });
    });

    it('collapses a burst of keystrokes into one request, for the last value typed', () => {
        const wrapper = mountPasswordChangeForm();

        return wrapper
            .get('[data-test=toggle-change-password]')
            .trigger('click')
            .then(() => wrapper.get('[data-test=new-password] input').setValue('p'))
            .then(() => wrapper.get('[data-test=new-password] input').setValue('pa'))
            .then(() => wrapper.get('[data-test=new-password] input').setValue('pas'))
            .then(() => vi.advanceTimersByTimeAsync(DELAY))
            .then(flushPromises)
            .then(() => {
                expect(checkCallCount()).toBe(1);
            });
    });

    it('never blocks the submit — advisory only, even while flagged breached', () => {
        responses['POST /account/password/check'] = orvalEnvelope({ breached: true });
        responses['POST /account/password'] = orvalEnvelope({ token: 'rotated-jwt' });
        const wrapper = mountPasswordChangeForm();

        return (
            wrapper
                .get('[data-test=toggle-change-password]')
                .trigger('click')
                .then(() =>
                    wrapper.get('[data-test=current-password] input').setValue('hunter2hunter2')
                )
                // Meets `usersPasswordSchema`'s composition rule (upper/lower/digit/special) so the
                // FORM'S OWN validation lets the submit through — the breach check is a separate
                // concern from strength, and this proves it never gates the strong-but-breached case.
                .then(() => wrapper.get('[data-test=new-password] input').setValue('Password1!'))
                .then(() =>
                    wrapper.get('[data-test=new-password-confirm] input').setValue('Password1!')
                )
                .then(() => vi.advanceTimersByTimeAsync(DELAY))
                .then(flushPromises)
                .then(() => {
                    expect(wrapper.find('[data-test=password-breach-warning]').exists()).toBe(true);
                    return wrapper.get('form').trigger('submit');
                })
                .then(flushPromises)
                .then(() => {
                    // The server accepted the change regardless of the client-side warning — proof
                    // this is advisory, never a gate.
                    expect(
                        vi
                            .mocked(orvalMutator)
                            .mock.calls.some(
                                (call) => (call[0] as { url: string }).url === '/account/password'
                            )
                    ).toBe(true);
                    expect(wrapper.find('[data-test=password-change-error]').exists()).toBe(false);
                })
        );
    });
});

describe('PasswordResetConfirm', () => {
    beforeEach(() => router.push('/en/password-reset-confirm').then(() => router.isReady()));

    it('warns on a breached candidate and clears once it is fixed', () => {
        responses['POST /account/password/check'] = orvalEnvelope({ breached: true });
        const wrapper = mountPasswordResetPage();

        return wrapper
            .get('input[type=password]')
            .setValue('password1')
            .then(() => vi.advanceTimersByTimeAsync(DELAY))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=password-breach-warning]').exists()).toBe(true);
                responses['POST /account/password/check'] = orvalEnvelope({ breached: false });
                return wrapper.get('input[type=password]').setValue('a-clean-one-2');
            })
            .then(() => vi.advanceTimersByTimeAsync(DELAY))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=password-breach-warning]').exists()).toBe(false);
            });
    });
});

describe('Signup', () => {
    beforeEach(() => {
        responses['GET /account/oauth/providers'] = orvalEnvelope({ providers: [] });
        return router.push('/en/signup').then(() => router.isReady());
    });

    it('warns on a breached candidate typed into the password field', () => {
        responses['POST /account/password/check'] = orvalEnvelope({ breached: true });
        const wrapper = mountSignupPage();

        return wrapper
            .get('input[type=password]')
            .setValue('password1')
            .then(() => vi.advanceTimersByTimeAsync(DELAY))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=password-breach-warning]').exists()).toBe(true);
            });
    });
});
