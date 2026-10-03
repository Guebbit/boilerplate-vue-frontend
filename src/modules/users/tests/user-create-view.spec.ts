/**
 * @module
 * Mounts the real admin create-user page against a real, memory-history router: what the form
 * refuses before anything is sent, the exact payload it sends, where a success lands, and that an
 * API refusal blocks the form in place. `createUser` is spied at the store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import UserCreate from '@/modules/users/views/UserCreate.vue';
import { useUsersStore } from '@/modules/users/store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this suite enables — success navigates for real.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page with `createUser` spied BEFORE mount — the view destructures it at setup.
 *
 * @returns The wrapper and the spy each case configures.
 */
const mountPage = () => {
    const create = vi.spyOn(useUsersStore(), 'createUser');
    const wrapper = mount(UserCreate, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });
    return { wrapper, create };
};

/**
 * Types the three required fields and submits. `data-test` lands on Vuetify's wrapper, so the
 * value goes to the `input` inside it.
 *
 * @param wrapper - The mounted page.
 * @param fields - What to type.
 * @param fields.email - The address.
 * @param fields.username - The username.
 * @param fields.password - The password.
 */
const fillAndSubmit = (
    wrapper: ReturnType<typeof mountPage>['wrapper'],
    fields: { email: string; username: string; password: string }
) =>
    wrapper
        .get('[data-test=user-email] input')
        .setValue(fields.email)
        .then(() => wrapper.get('[data-test=user-username] input').setValue(fields.username))
        .then(() => wrapper.get('[data-test=user-password] input').setValue(fields.password))
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

/** A password the shared composition rule accepts. */
const GOOD_PASSWORD = 'Str0ng-Enough-Pass!';

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/users/create').then(() => router.isReady())
    );
});

describe('UserCreate', () => {
    it('starts with the "Active" switch on, as the server defaults it', () => {
        const { wrapper } = mountPage();

        expect(wrapper.get<HTMLInputElement>('[data-test=user-active] input').element.checked).toBe(
            true
        );
    });

    it('sends active: false once the switch is turned off', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(aUser({ id: 'u-new', email: 'ada@example.com' }));

        return wrapper
            .get('[data-test=user-active] input')
            .setValue(false)
            .then(() =>
                fillAndSubmit(wrapper, {
                    email: 'ada@example.com',
                    username: 'ada',
                    password: GOOD_PASSWORD
                })
            )
            .then(() => {
                expect(create).toHaveBeenCalledWith(
                    expect.objectContaining({ active: false }),
                    expect.anything()
                );
            });
    });

    it('refuses an address that is not one, and sends nothing', () => {
        const { wrapper, create } = mountPage();

        return fillAndSubmit(wrapper, {
            email: 'not-an-email',
            username: 'ada',
            password: GOOD_PASSWORD
        }).then(() => {
            expect(create).not.toHaveBeenCalled();
            expect(wrapper.find('[data-test=user-email] .v-messages').text()).not.toBe('');
        });
    });

    it('sends exactly the typed fields, then opens the new user', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(aUser({ id: 'u-new', email: 'ada@example.com' }));

        return fillAndSubmit(wrapper, {
            email: 'ada@example.com',
            username: 'ada',
            password: GOOD_PASSWORD
        })
            .then(() => {
                expect(create).toHaveBeenCalledWith(
                    {
                        email: 'ada@example.com',
                        username: 'ada',
                        password: GOOD_PASSWORD,
                        sendSetupEmail: undefined,
                        role: undefined,
                        active: true,
                        locale: undefined,
                        imageUpload: undefined
                    },
                    { requestOptions: undefined }
                );
                return vi.waitFor(() => {
                    if (!router.currentRoute.value.fullPath.endsWith('/u-new'))
                        throw new Error('still on the create page');
                });
            })
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/users/u-new');
            });
    });

    // U2: the backend 422s a create with neither a password nor `sendSetupEmail: true` — the form
    // must refuse it before that round trip, not only report the server's own rejection.
    it('refuses a create with no password and no setup email, and sends nothing', () => {
        const { wrapper, create } = mountPage();

        return wrapper
            .get('[data-test=user-email] input')
            .setValue('ada@example.com')
            .then(() => wrapper.get('[data-test=user-username] input').setValue('ada'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(create).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=user-password] .v-messages').text()).not.toBe('');
            });
    });

    it('accepts a blank password once "send setup email" is checked, and sends no password', () => {
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(aUser({ id: 'u-new', email: 'ada@example.com' }));

        return wrapper
            .get('[data-test=user-email] input')
            .setValue('ada@example.com')
            .then(() => wrapper.get('[data-test=user-username] input').setValue('ada'))
            .then(() => wrapper.get('[data-test=user-send-setup-email] input').setValue(true))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        password: undefined,
                        sendSetupEmail: true
                    }),
                    { requestOptions: undefined }
                );
            });
    });

    it('blocks the form in place when the API refuses the create', () => {
        const { wrapper, create } = mountPage();
        create.mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });

        return fillAndSubmit(wrapper, {
            email: 'ada@example.com',
            username: 'ada',
            password: GOOD_PASSWORD
        }).then(() => {
            expect(wrapper.find('[data-test=user-create-submit-error]').exists()).toBe(true);
            expect(router.currentRoute.value.fullPath).toBe('/en/users/create');
        });
    });

    // FormCard's submit button bound :loading only, and in Vuetify 4.1.5 loading does not
    // disable the button — a real second click (or Enter) while the first create was still in
    // flight fired a second request. FormCard now also binds :disabled="loading", which a
    // browser (and jsdom) refuses to dispatch a click's default action through.
    it('disables the submit button while a create is in flight', () => {
        const { wrapper, create } = mountPage();
        create.mockReturnValue(new Promise(() => undefined));

        return wrapper
            .get('[data-test=user-email] input')
            .setValue('ada@example.com')
            .then(() => wrapper.get('[data-test=user-username] input').setValue('ada'))
            .then(() => wrapper.get('[data-test=user-password] input').setValue(GOOD_PASSWORD))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(create).toHaveBeenCalledTimes(1);
                expect(
                    wrapper.get('form button[type=submit]').attributes('disabled')
                ).not.toBeUndefined();
            });
    });

    it('puts a field error the API names on that field, not in the banner', () => {
        const { wrapper, create } = mountPage();
        // As `onResponseReject` hands it on: the contract's `details.field`, lifted to `field`.
        create.mockRejectedValue({
            success: false,
            status: 422,
            message: 'Unprocessable Entity',
            errors: [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'Address already in use',
                    details: { field: 'email' },
                    field: 'email'
                }
            ]
        });

        return fillAndSubmit(wrapper, {
            email: 'ada@example.com',
            username: 'ada',
            password: GOOD_PASSWORD
        }).then(() => {
            expect(wrapper.find('[data-test=user-email] .v-messages').text()).toContain(
                'Address already in use'
            );
            expect(wrapper.find('[data-test=user-create-submit-error]').exists()).toBe(false);
        });
    });
});
