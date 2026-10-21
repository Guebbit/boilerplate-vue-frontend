/**
 * @module
 * Mounts the real verify-email and email-change-undo pages, which share `LinkTokenConfirmCard`:
 * the token is read from the `#token=` fragment and scrubbed off the URL, nothing is spent on
 * mount, a submit spends exactly that token and lands on the page's own route, and a refusal
 * blocks the form in place. The store calls are spied at the profile store.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import VerifyEmailConfirm from '../views/VerifyEmailConfirm.vue';
import EmailChangeUndo from '../views/EmailChangeUndo.vue';
import { useProfileStore } from '../stores/profile.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The real app router — success navigates by route name through it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts a page with its store call spied BEFORE mount — the view destructures it at setup.
 *
 * @param page - The routed view under test.
 * @param action - The profile-store action the page spends the token with.
 * @returns The wrapper and the spy each case configures.
 */
const mountPage = (
    page: typeof VerifyEmailConfirm,
    action: 'confirmEmailVerification' | 'undoEmailChange'
) => {
    const spend = vi.spyOn(useProfileStore(), action).mockResolvedValue(undefined);
    const wrapper = mount(page, { global: { plugins: [router, vuetify, i18n] } });
    // Spied only once mounted, so the fragment scrub (a `replace`) still runs for real; the
    // success redirect's target is the assertion, not where the test router can actually go.
    const navigate = vi.spyOn(router, 'push').mockResolvedValue(undefined);
    return { wrapper, spend, navigate };
};

/**
 * Submits the form and lets the chain settle.
 *
 * @param wrapper - The mounted page.
 */
const submit = (wrapper: ReturnType<typeof mountPage>['wrapper']) =>
    wrapper.get('form').trigger('submit').then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('LinkTokenConfirmCard', () => {
    it('prefills the token from the fragment, scrubs it, and spends nothing on mount', () =>
        router
            .push('/en/verify-email/confirm#token=abc123')
            .then(() => router.isReady())
            .then(() => {
                const { wrapper, spend } = mountPage(
                    VerifyEmailConfirm,
                    'confirmEmailVerification'
                );
                return flushPromises().then(() => {
                    expect(
                        (wrapper.get('[data-test=verify-token] input').element as HTMLInputElement)
                            .value
                    ).toBe('abc123');
                    expect(router.currentRoute.value.hash).toBe('');
                    expect(spend).not.toHaveBeenCalled();
                });
            }));

    it('spends the token on submit and lands on Home', () =>
        router.push('/en/verify-email/confirm#token=abc123').then(() => {
            const { wrapper, spend, navigate } = mountPage(
                VerifyEmailConfirm,
                'confirmEmailVerification'
            );
            return submit(wrapper).then(() => {
                expect(spend).toHaveBeenCalledExactlyOnceWith('abc123');
                expect(navigate).toHaveBeenCalledExactlyOnceWith(
                    expect.objectContaining({ name: 'Home' })
                );
            });
        }));

    it('refuses an empty token and sends nothing', () =>
        router.push('/en/verify-email/confirm').then(() => {
            const { wrapper, spend } = mountPage(VerifyEmailConfirm, 'confirmEmailVerification');
            return submit(wrapper).then(() => {
                expect(spend).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=verify-token] .v-messages').text()).not.toBe('');
            });
        }));

    it('blocks the form in place when the token is refused', () =>
        router.push('/en/verify-email/confirm#token=spent').then(() => {
            const mounted = mountPage(VerifyEmailConfirm, 'confirmEmailVerification');
            const { wrapper, spend } = mounted;
            spend.mockRejectedValue({
                success: false,
                status: 400,
                message: 'Bad Request',
                errors: [{ code: 'TOKEN_INVALID', message: 'This link is no longer valid' }]
            });
            const { navigate } = mounted;
            return submit(wrapper).then(() => {
                expect(wrapper.find('[data-test=verify-email-confirm-error]').exists()).toBe(true);
                expect(navigate).not.toHaveBeenCalled();
            });
        }));

    it("lands on the page's own route: Login for the undo", () =>
        router.push('/en/email-change/undo#token=undo1').then(() => {
            const { wrapper, spend, navigate } = mountPage(EmailChangeUndo, 'undoEmailChange');
            return submit(wrapper).then(() => {
                expect(spend).toHaveBeenCalledExactlyOnceWith('undo1');
                expect(navigate).toHaveBeenCalledExactlyOnceWith(
                    expect.objectContaining({ name: 'Login' })
                );
            });
        }));
});
