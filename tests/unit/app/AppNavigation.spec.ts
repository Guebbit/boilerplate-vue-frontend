/**
 * App navigation.
 *
 * Beyond rendering, this pins the property that makes the menu trustworthy: an entry is shown
 * exactly when the router would let the visitor enter the route it points at. The nav reads
 * `meta.access` off the resolved route rather than carrying its own visibility flags, so the two
 * cannot drift — and these cases are what would catch it if someone reintroduced a flag.
 *
 * ── Why the modules here are invented ────────────────────────────────────────────────────────
 * `AppNavigation` builds its list from `collectModuleNavigation(enabledModules)`. Asserting
 * against the REAL registry would mean naming `products`, `cart`, `admin`… in a platform spec —
 * the exact coupling the manifest removed from `src/`, moved into `tests/`. Deleting a domain
 * would then break a test that is not about that domain at all (see `docs/theory/modules.md`,
 * "Deleting a domain").
 *
 * So `@/modules` is mocked with three throwaway domains covering the three visibility classes.
 * What is under test is the mechanism — filter by the resolved route's `meta.access`, order by
 * `order` — and the mechanism is what breaks. That every real module's entry points at a route it
 * actually declares is a separate, registry-driven invariant: `tests/cross-cutting/registry.spec.ts`.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia } from 'pinia';
import AppNavigation from '@/app/components/AppNavigation.vue';
import vuetify from '@/ui/vuetify';
import type { RouteAccess } from '@/app/middlewares/authentications';

const session = {
    isAuth: ref(false),
    isAdmin: ref(false),
    viewer: ref<{ email: string } | undefined>(undefined)
};

/**
 * Which of the auth routes this build ships.
 *
 * The shell addresses `Login` and `Signup` by name — strings the account module owns and nothing
 * type-checks — so it asks `router.hasRoute` before offering either. Flipping this to `false` is
 * the "no account module in this build" case.
 */
const registeredRoutes = ref<string[]>(['Login', 'Signup']);

/** Access declared by the routes the invented modules link to, plus the shell's own two. */
const routeAccess: Record<string, RouteAccess | undefined> = {
    Home: undefined,
    Playground: undefined,
    PublicThing: undefined,
    MemberThing: 'auth',
    StaffThing: 'admin'
};

/*
 * Three invented domains, one per visibility class. `order` is deliberately out of sequence so the
 * sort is exercised rather than accidentally satisfied by declaration order.
 */
vi.mock('@/modules', () => ({
    enabledModules: [
        {
            name: 'staff-domain',
            routes: [],
            navigation: [{ name: 'StaffThing', label: 'navigation.label-staff', order: 90 }]
        },
        {
            name: 'public-domain',
            routes: [],
            navigation: [{ name: 'PublicThing', label: 'navigation.label-public', order: 30 }]
        },
        {
            name: 'member-domain',
            routes: [],
            navigation: [{ name: 'MemberThing', label: 'navigation.label-member', order: 60 }]
        }
    ]
}));

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
        resolve: ({ name }: { name: string }) => ({ meta: { access: routeAccess[name] } }),
        hasRoute: (name: string) => registeredRoutes.value.includes(name)
    })
}));

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => session
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
        session.isAuth.value = false;
        session.isAdmin.value = false;
        session.viewer.value = undefined;
        registeredRoutes.value = ['Login', 'Signup'];
    });

    it('renders properly', () => {
        expect(mountNav().wrapper).toBeTruthy();
    });

    it('shows a guest only the public entries', () => {
        const { text } = mountNav();

        expect(text).toContain('navigation.label-home');
        expect(text).toContain('navigation.label-public');
        expect(text).not.toContain('navigation.label-member');
        expect(text).not.toContain('navigation.label-staff');
    });

    it('adds the authenticated entries once logged in, but not the admin ones', () => {
        session.isAuth.value = true;

        const { text } = mountNav();

        expect(text).toContain('navigation.label-member');
        // The trap this guards: an admin-only page listed for every logged-in visitor.
        expect(text).not.toContain('navigation.label-staff');
    });

    it('shows the admin entries to an admin', () => {
        session.isAuth.value = true;
        session.isAdmin.value = true;

        const { text } = mountNav();

        expect(text).toContain('navigation.label-staff');
        expect(text).toContain('navigation.label-member');
    });

    it('orders module entries by `order`, not by module registration order', () => {
        session.isAuth.value = true;
        session.isAdmin.value = true;

        const { text } = mountNav();

        // staff-domain is registered first but ordered last.
        expect(text.indexOf('navigation.label-public')).toBeLessThan(
            text.indexOf('navigation.label-member')
        );
        expect(text.indexOf('navigation.label-member')).toBeLessThan(
            text.indexOf('navigation.label-staff')
        );
    });

    it('offers sign-in and sign-up when the account routes are registered', () => {
        const { text } = mountNav();

        expect(text).toContain('navigation.label-login');
        expect(text).toContain('navigation.label-signup');
    });

    it('offers neither when this build ships no sign-in route', () => {
        // A build with the account module deleted: the shell must not render a button that
        // navigates nowhere. Route names are strings, so only `hasRoute` can tell.
        registeredRoutes.value = [];

        const { text } = mountNav();

        expect(text).not.toContain('navigation.label-login');
        expect(text).not.toContain('navigation.label-signup');
    });

    it('renders the shell entries when no module contributes anything', () => {
        // The event-portal end state: every domain deleted, the shell still has a menu.
        const { text } = mountNav();

        expect(text).toContain('navigation.label-home');
        expect(text).toContain('navigation.label-playground');
    });
});
