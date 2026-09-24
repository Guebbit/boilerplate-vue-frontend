/**
 * @module
 * Mounts the real "forgot password" page: what it refuses before anything is sent, what it sends,
 * and the two ways a refusal comes back — a field the API names lands on that field, anything else
 * blocks the form in place. `requestPasswordReset` is spied at the auth store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import PasswordResetRequest from '@/modules/account/views/PasswordResetRequest.vue';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The real app router — the page links back to login through it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page with the store call spied BEFORE mount — the view destructures it at setup.
 *
 * @returns The wrapper and the spy each case configures.
 */
const mountPage = () => {
    const request = vi.spyOn(useAuthStore(), 'requestPasswordReset');
    const wrapper = mount(PasswordResetRequest, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, request };
};

/**
 * Types an address and submits. `data-test` lands on Vuetify's wrapper, so the value goes to the
 * `input` inside it.
 *
 * @param wrapper - The mounted page.
 * @param email - What to type.
 */
const submitEmail = (wrapper: ReturnType<typeof mountPage>['wrapper'], email: string) =>
    wrapper
        .get('[data-test=password-reset-email] input')
        .setValue(email)
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

/** The field message under the email input — empty when the field is valid. */
const emailMessage = (wrapper: ReturnType<typeof mountPage>['wrapper']) =>
    wrapper.find('[data-test=password-reset-email] .v-messages').text();

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/password-reset').then(() => router.isReady())
    );
});

describe('PasswordResetRequest', () => {
    it('refuses an address that is not one, and sends nothing', () => {
        const { wrapper, request } = mountPage();

        return submitEmail(wrapper, 'not-an-email').then(() => {
            expect(request).not.toHaveBeenCalled();
            expect(emailMessage(wrapper)).not.toBe('');
        });
    });

    it('sends the typed address, and nothing else', () => {
        const { wrapper, request } = mountPage();
        request.mockResolvedValue(undefined);

        return submitEmail(wrapper, 'ada@example.com').then(() => {
            expect(request).toHaveBeenCalledExactlyOnceWith('ada@example.com');
            expect(wrapper.find('[data-test=password-reset-request-error]').exists()).toBe(false);
        });
    });

    it('puts a field error the API names on that field, not in a banner', () => {
        const { wrapper, request } = mountPage();
        // As `onResponseReject` hands it on: the contract's `details.field`, lifted to `field`.
        request.mockRejectedValue({
            success: false,
            status: 422,
            message: 'Unprocessable Entity',
            errors: [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'Not a deliverable address',
                    details: { field: 'email' },
                    field: 'email'
                }
            ]
        });

        return submitEmail(wrapper, 'ada@example.com').then(() => {
            expect(emailMessage(wrapper)).toContain('Not a deliverable address');
            expect(wrapper.find('[data-test=password-reset-request-error]').exists()).toBe(false);
        });
    });

    it('blocks the form in place for a refusal that names no field', () => {
        const { wrapper, request } = mountPage();
        request.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });

        return submitEmail(wrapper, 'ada@example.com').then(() => {
            expect(wrapper.find('[data-test=password-reset-request-error]').exists()).toBe(true);
        });
    });
});
