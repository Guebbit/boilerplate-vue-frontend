/**
 * App navigation.
 *
 * Beyond rendering, this pins the property that makes the menu trustworthy: an entry is shown
 * exactly when the router would let the visitor enter the route it points at. The nav reads
 * `meta.access` off the resolved route rather than carrying its own visibility flags, so the two
 * cannot drift — and these cases are what would catch it if someone reintroduced a flag.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import AppNavigation from '@/components/organisms/AppNavigation.vue';
import vuetify from '@/plugins/vuetify';
import type { TRouteAccess } from '@/middlewares/authentications';

const profile = {
    isAuth: ref(false),
    isAdmin: ref(false),
    profile: ref<{ email: string } | undefined>(undefined),
    updateProfileLanguage: vi.fn()
};

/**
 * What the real route records declare, for the routes the nav links to.
 * Kept in step with `features/<domain>/routes.ts` by `tests/unit/router/router.spec.ts`, which
 * asserts the same values against the actual router.
 */
const routeAccess: Record<string, TRouteAccess | undefined> = {
    Home: undefined,
    Playground: undefined,
    RealtimePlayground: undefined,
    ProductsList: undefined,
    Admin: 'admin',
    UsersList: 'admin',
    Profile: 'auth',
    Cart: 'auth',
    OrdersList: 'auth'
};

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key,
            locale: ref('en')
        })
    };
});

vi.mock('vue-router', () => ({
    RouterLink: {
        template: '<a><slot /></a>'
    },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        resolve: ({ name }: { name: string }) => ({ meta: { access: routeAccess[name] } })
    })
}));

vi.mock('@/stores/profile.ts', () => ({
    useProfileStore: () => profile
}));

/** Mounts the nav and returns the labels of the entries it rendered. */
const mountNav = () => {
    const wrapper = mount(AppNavigation, {
        global: {
            plugins: [createPinia(), vuetify],
            stubs: {
                // v-app-bar teleports into a v-app layout that does not exist here
                VAppBar: {
                    template:
                        '<header><slot name="prepend" /><slot /><slot name="append" /></header>'
                },
                VNavigationDrawer: { template: '<aside><slot /></aside>' }
            }
        }
    });
    return { wrapper, text: wrapper.text() };
};

describe('Navigation', () => {
    beforeEach(() => {
        profile.isAuth.value = false;
        profile.isAdmin.value = false;
        profile.profile.value = undefined;
    });

    it('renders properly', () => {
        expect(mountNav().wrapper).toBeTruthy();
    });

    it('shows a guest only the public entries', () => {
        const { text } = mountNav();

        expect(text).toContain('navigation.label-home');
        expect(text).toContain('navigation.label-products-list');
        expect(text).not.toContain('navigation.label-cart');
        expect(text).not.toContain('navigation.label-orders');
        expect(text).not.toContain('navigation.label-profile');
        expect(text).not.toContain('navigation.label-users-list');
        expect(text).not.toContain('navigation.label-admin');
    });

    it('adds the authenticated entries once logged in, but not the admin ones', () => {
        profile.isAuth.value = true;

        const { text } = mountNav();

        expect(text).toContain('navigation.label-cart');
        expect(text).toContain('navigation.label-orders');
        expect(text).toContain('navigation.label-profile');
        // The trap this guards: an admin-only page listed for every logged-in visitor.
        expect(text).not.toContain('navigation.label-users-list');
        expect(text).not.toContain('navigation.label-admin');
    });

    it('shows the admin entries to an admin', () => {
        profile.isAuth.value = true;
        profile.isAdmin.value = true;

        const { text } = mountNav();

        expect(text).toContain('navigation.label-users-list');
        expect(text).toContain('navigation.label-admin');
        expect(text).toContain('navigation.label-cart');
    });
});
