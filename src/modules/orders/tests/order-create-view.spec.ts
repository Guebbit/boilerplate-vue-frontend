/**
 * @module
 * Mounts the real "New order" page against a real, memory-history router: what the form refuses
 * before anything is sent, the exact payload it sends for a walk-in and for an account, who is
 * offered the account picker, where a success goes and what a refusal does. The store's call is
 * spied at the store; the product and account searches are canned, their own suites prove them.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import OrderCreate from '../views/OrderCreate.vue';
import { useOrdersStore } from '../store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { anOrder, aProblem, aUser } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/*
 * The product picker is `inventory`'s and has its own suite: here it only has to offer two products.
 */
vi.mock('@/modules/inventory', () => ({
    useProductPicker: () => ({
        query: ref(''),
        options: ref([
            { value: 'p1', title: 'Widget' },
            { value: 'p2', title: 'Gadget' }
        ])
    })
}));

/*
 * The account search the picker runs; the real client stays for every other call.
 */
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchUsers: vi.fn(() =>
        Promise.resolve({
            items: [aUser({ id: 'u7', username: 'ada', email: 'ada@example.com' })],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
        })
    )
}));

/**
 * The real app router, scoped to the modules this suite enables, so the redirect after a create is
 * a real navigation.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Signs in as staff who may create orders, and optionally read users.
 *
 * @param canReadUsers - Whether the viewer also holds `read:User`.
 */
const signInAsStaff = (canReadUsers: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'staff-1', email: 'staff@example.com', role: 'manager' };
    session.setAbilities({
        tenant: canReadUsers
            ? [
                  ['create', 'Order'],
                  ['read', 'User']
              ]
            : [['create', 'Order']],
        platform: []
    });
};

/**
 * Mounts the page with its store call spied BEFORE mount: the view destructures it at setup.
 *
 * @returns The wrapper and the create spy each case configures.
 */
const mountPage = () => {
    const create = vi.spyOn(useOrdersStore(), 'createOrder');
    const wrapper = mount(OrderCreate, {
        attachTo: document.body,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, create };
};

/**
 * Adds one line: picks the product, types the quantity and presses Add.
 *
 * @param wrapper - The mounted page.
 * @param productId - One of the picker's two products.
 * @param quantity - How many.
 */
const addLine = (
    wrapper: ReturnType<typeof mountPage>['wrapper'],
    productId: string,
    quantity = 1
) =>
    wrapper
        .findComponent('[data-test=order-product]')
        .setValue(productId)
        .then(() => wrapper.get('[data-test=order-quantity] input').setValue(quantity))
        .then(() => wrapper.get('[data-test=order-add-line]').trigger('click'))
        .then(flushPromises);

/**
 * Types the receipt email and submits.
 *
 * @param wrapper - The mounted page.
 * @param email - What goes in the email field.
 */
const fillEmailAndSubmit = (wrapper: ReturnType<typeof mountPage>['wrapper'], email: string) =>
    wrapper
        .get('[data-test=order-email] input')
        .setValue(email)
        .then(() => wrapper.get('form').trigger('submit'))
        .then(flushPromises);

beforeEach(() => {
    setActivePinia(createPinia());
    document.body.replaceChildren();
    return loadLocale('en').then(() =>
        router.push('/en/sales/orders/new').then(() => router.isReady())
    );
});

describe('OrderCreate', () => {
    it('refuses an order with no lines, and sends nothing', () => {
        signInAsStaff(false);
        const { wrapper, create } = mountPage();

        return fillEmailAndSubmit(wrapper, 'counter@example.com').then(() => {
            expect(create).not.toHaveBeenCalled();
            expect(wrapper.get('[data-test=order-lines-error]').text()).not.toBe('');
        });
    });

    it('refuses a missing email, and sends nothing', () => {
        signInAsStaff(false);
        const { wrapper, create } = mountPage();

        return addLine(wrapper, 'p1')
            .then(() => fillEmailAndSubmit(wrapper, ''))
            .then(() => {
                expect(create).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=order-email] .v-messages').text()).not.toBe('');
            });
    });

    it('sends a walk-in order without an account, then opens it', () => {
        signInAsStaff(false);
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(anOrder({ id: 'o1' }));

        return addLine(wrapper, 'p1', 2)
            .then(() => fillEmailAndSubmit(wrapper, 'counter@example.com'))
            .then(() => {
                expect(create).toHaveBeenCalledExactlyOnceWith({
                    email: 'counter@example.com',
                    items: [{ productId: 'p1', quantity: 2 }]
                });
                return vi.waitFor(() => {
                    if (!router.currentRoute.value.fullPath.endsWith('/o1'))
                        throw new Error('still on the create page');
                });
            })
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/orders/o1');
                wrapper.unmount();
            });
    });

    it('adds to a line when the same product is added again, and drops a removed line', () => {
        signInAsStaff(false);
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(anOrder({ id: 'o1' }));

        return addLine(wrapper, 'p1', 1)
            .then(() => addLine(wrapper, 'p1', 2))
            .then(() => addLine(wrapper, 'p2', 1))
            .then(() => {
                expect(wrapper.findAll('[data-test=order-line]')).toHaveLength(2);
                return wrapper.findAll('[data-test=order-remove-line]')[1].trigger('click');
            })
            .then(() => fillEmailAndSubmit(wrapper, 'counter@example.com'))
            .then(() => {
                expect(create).toHaveBeenCalledExactlyOnceWith({
                    email: 'counter@example.com',
                    items: [{ productId: 'p1', quantity: 3 }]
                });
            });
    });

    it('offers no account picker to a viewer who cannot read users', () => {
        signInAsStaff(false);
        const { wrapper } = mountPage();

        expect(wrapper.find('[data-test=order-buyer]').exists()).toBe(false);
        expect(wrapper.find('[data-test=order-account]').exists()).toBe(false);
        expect(wrapper.get('[data-test=order-buyer-walk-in-note]').text()).toContain('walk-in');
    });

    it('sends the chosen account, and drops it again when the buyer goes back to a walk-in', () => {
        signInAsStaff(true);
        const { wrapper, create } = mountPage();
        create.mockResolvedValue(anOrder({ id: 'o1' }));

        expect(wrapper.find('[data-test=order-account]').exists()).toBe(false);

        return wrapper
            .findComponent('[data-test=order-buyer]')
            .setValue(true)
            .then(() => wrapper.findComponent('[data-test=order-account]').setValue('u7'))
            .then(() => addLine(wrapper, 'p1'))
            .then(() => fillEmailAndSubmit(wrapper, 'ada@example.com'))
            .then(() => {
                expect(create).toHaveBeenLastCalledWith({
                    userId: 'u7',
                    email: 'ada@example.com',
                    items: [{ productId: 'p1', quantity: 1 }]
                });
                return wrapper.findComponent('[data-test=order-buyer]').setValue(false);
            })
            .then(() => fillEmailAndSubmit(wrapper, 'ada@example.com'))
            .then(() => {
                expect(create).toHaveBeenLastCalledWith(
                    expect.not.objectContaining({ userId: expect.anything() as unknown })
                );
            });
    });

    it('refuses an account buyer with no account picked, and sends nothing', () => {
        signInAsStaff(true);
        const { wrapper, create } = mountPage();

        return wrapper
            .findComponent('[data-test=order-buyer]')
            .setValue(true)
            .then(() => addLine(wrapper, 'p1'))
            .then(() => fillEmailAndSubmit(wrapper, 'ada@example.com'))
            .then(() => {
                expect(create).not.toHaveBeenCalled();
                expect(wrapper.find('[data-test=order-account] .v-messages').text()).not.toBe('');
            });
    });

    it('blocks the form in place when the API fails', () => {
        signInAsStaff(false);
        const { wrapper, create } = mountPage();
        create.mockRejectedValue(aProblem(500, [{ code: 'INTERNAL', message: 'Server error' }]));

        return addLine(wrapper, 'p1')
            .then(() => fillEmailAndSubmit(wrapper, 'counter@example.com'))
            .then(() => {
                expect(wrapper.find('[data-test=order-create-error]').exists()).toBe(true);
                expect(router.currentRoute.value.fullPath).toBe('/en/sales/orders/new');
            });
    });
});
