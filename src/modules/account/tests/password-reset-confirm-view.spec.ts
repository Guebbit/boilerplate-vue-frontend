/**
 * @module
 * Mounts the real password-reset confirm page in both modes. The Terms box is the point: always
 * there, unticked, on the setup page; on the reset page only after the API answers 422 naming
 * `termsAccepted`. The tick is sent only while the box is shown. `confirmPasswordReset` is spied
 * at the auth store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import PasswordResetConfirm from '../views/PasswordResetConfirm.vue';
import { useAccountAuthStore } from '../stores/auth.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * A password the shared composition rule accepts.
 */
const VALID_PASSWORD = 'Str0ng!Passw0rd';

/**
 * The real app router: the page links to login and the Terms through it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page in `mode` with the store call spied BEFORE mount.
 *
 * @param mode - which door the visitor came through
 * @returns The wrapper and the spy each case configures.
 */
const mountPage = (mode: 'reset' | 'setup') => {
    const confirm = vi.spyOn(useAccountAuthStore(), 'confirmPasswordReset');
    const wrapper = mount(PasswordResetConfirm, {
        props: { mode },
        global: {
            plugins: [router, vuetify, i18n],
            // The Terms and Privacy pages belong to another module this router does not carry.
            stubs: { RouterLink: { template: '<a><slot /></a>' } }
        }
    });
    return { wrapper, confirm };
};

/**
 * Types a valid password pair, optionally ticks the Terms, and submits.
 *
 * @param wrapper - The mounted page.
 * @param tick - Whether to tick the Terms box first.
 */
const submit = (wrapper: ReturnType<typeof mountPage>['wrapper'], tick = false) => {
    const fields = wrapper.findAll('input[type=password]');
    return fields[0]
        .setValue(VALID_PASSWORD)
        .then(() => fields[1].setValue(VALID_PASSWORD))
        .then(() =>
            tick
                ? wrapper.get('[data-test=password-reset-terms-accepted] input').setValue(true)
                : undefined
        )
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);
};

/** The Terms box, when it is on screen. */
const termsBox = (wrapper: ReturnType<typeof mountPage>['wrapper']) =>
    wrapper.find('[data-test=password-reset-terms-accepted]');

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/account-setup#token=a-token').then(() => router.isReady())
    );
});

describe('PasswordResetConfirm, setup mode', () => {
    it('shows the Terms box unticked', () => {
        const { wrapper } = mountPage('setup');

        expect(termsBox(wrapper).exists()).toBe(true);
        expect(
            wrapper.get<HTMLInputElement>('[data-test=password-reset-terms-accepted] input').element
                .checked
        ).toBe(false);
    });

    it('sends nothing until the box is ticked', () => {
        const { wrapper, confirm } = mountPage('setup');

        return submit(wrapper).then(() => {
            expect(confirm).not.toHaveBeenCalled();
        });
    });

    it('sends the tick with the new password once ticked', () => {
        const { wrapper, confirm } = mountPage('setup');
        confirm.mockResolvedValue(undefined);

        return submit(wrapper, true).then(() => {
            expect(confirm).toHaveBeenCalledExactlyOnceWith(
                'a-token',
                VALID_PASSWORD,
                VALID_PASSWORD,
                true
            );
        });
    });
});

describe('PasswordResetConfirm, reset mode', () => {
    it('hides the Terms box and sends no tick for an account that has accepted', () => {
        const { wrapper, confirm } = mountPage('reset');
        confirm.mockResolvedValue(undefined);

        return submit(wrapper).then(() => {
            expect(termsBox(wrapper).exists()).toBe(false);
            expect(confirm).toHaveBeenCalledExactlyOnceWith(
                'a-token',
                VALID_PASSWORD,
                VALID_PASSWORD,
                undefined
            );
        });
    });

    it('shows the box when the API names termsAccepted, then sends the tick', () => {
        const { wrapper, confirm } = mountPage('reset');
        confirm.mockRejectedValueOnce(
            aProblem(422, [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'You must accept the Terms of Service',
                    details: { field: 'termsAccepted' },
                    field: 'termsAccepted'
                }
            ])
        );
        confirm.mockResolvedValue(undefined);

        return submit(wrapper)
            .then(() => {
                expect(termsBox(wrapper).exists()).toBe(true);
                return submit(wrapper, true);
            })
            .then(() => {
                expect(confirm).toHaveBeenLastCalledWith(
                    'a-token',
                    VALID_PASSWORD,
                    VALID_PASSWORD,
                    true
                );
            });
    });
});
