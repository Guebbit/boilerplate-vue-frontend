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
import { i18n, loadLocale } from '@/infrastructure/i18n';
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
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
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
                        role: undefined,
                        active: undefined,
                        imageUpload: undefined
                    },
                    undefined
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
});
