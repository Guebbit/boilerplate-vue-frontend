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
import type { RouteAccess } from '@/app/guards/authentications';

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

/** The route the visitor is currently on, as `useRoute()` reports it. */
const currentRoute = ref<{ name?: string; fullPath: string }>({ fullPath: '/' });

/** Access declared by the routes the invented modules link to, plus the shell's own two. */
const routeAccess: Record<string, RouteAccess | undefined> = {
    Home: undefined,
    Playground: undefined,
    PublicThing: undefined,
    MemberThing: 'auth',
    StaffThing: 'admin'
};

/** The live count behind the public entry's badge; `0` renders no badge at all. */
const publicCount = ref(0);

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
            navigation: [
                {
                    name: 'PublicThing',
                    label: 'navigation.label-public',
                    order: 30,
                    badge: () => publicCount
                }
            ]
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
            // The plural form is echoed so a label built with `t(key, count)` can be asserted on.
            t: (key: string, count?: number) => (count === undefined ? key : `${key}:${count}`),
            locale: ref('en')
        })
    };
});

vi.mock('vue-router', () => ({
    RouterLink: {
        template: '<a><slot /></a>'
    },
    useRoute: () => ({ ...currentRoute.value, params: {}, query: {} }),
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        resolve: ({ name }: { name: string }) => ({ meta: { access: routeAccess[name] } }),
        hasRoute: (name: string) => registeredRoutes.value.includes(name)
    })
}));

vi.mock('@/infrastructure/stores/session.ts', () => ({
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
                // `v-model` becomes a plain attribute on a stub; the aside is always rendered.
                VNavigationDrawer: { template: '<aside><slot /></aside>' }
            }
        },
        // In the document, so focus can actually move: jsdom ignores `focus()` on a detached node.
        attachTo: document.body
    });
    return { wrapper, text: wrapper.text() };
};

/**
 * Whether the app bar renders NO control carrying `label`.
 *
 * The auth links are `v-if`-ed, not `v-show`-hidden: a hidden-but-present button is still in
 * the tab order, which is the accessibility defect this helper now guards against. So "hidden"
 * means "absent from the DOM" — an `a` or a `button`, whichever Vuetify renders for a `to`.
 */
const isHidden = (wrapper: ReturnType<typeof mountNav>['wrapper'], label: string) =>
    !wrapper
        .findAll('header a, header button')
        .some((candidate) => candidate.text().includes(label));

describe('Navigation', () => {
    beforeEach(() => {
        session.isAuth.value = false;
        session.isAdmin.value = false;
        session.viewer.value = undefined;
        registeredRoutes.value = ['Login', 'Signup'];
        currentRoute.value = { fullPath: '/' };
        publicCount.value = 0;
        document.body.innerHTML = '';
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

    /**
     * Hidden by ROUTE NAME, not by a substring of the path: a substring match also fires on
     * `/en/products/login-adapter` and on any `?continue=/en/login`.
     */
    it.each([
        ['Login', 'navigation.label-login'],
        ['Signup', 'navigation.label-signup']
    ])('hides the %s button while the visitor is already on that page', (name, label) => {
        currentRoute.value = { name, fullPath: `/en/${name.toLowerCase()}` };

        expect(isHidden(mountNav().wrapper, label)).toBe(true);
    });

    it('keeps both buttons on a route that merely CONTAINS the word login', () => {
        currentRoute.value = { name: 'ProductTarget', fullPath: '/en/products/login-adapter' };

        const { wrapper } = mountNav();

        expect(isHidden(wrapper, 'navigation.label-login')).toBe(false);
        expect(isHidden(wrapper, 'navigation.label-signup')).toBe(false);
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
        expect(text).toContain('navigation.label-about');
    });

    /**
     * Links, not buttons. A screen reader says "link" for something that navigates, and a
     * middle-click opens a tab; the old `@click="router.push(...)"` buttons did neither.
     */
    it('renders sign-in and sign-up as links to their routes', () => {
        const { wrapper } = mountNav();

        // The mocked `RouterLink` resolves no `href`, so the element's kind is what is pinned.
        const login = wrapper
            .findAll('header a')
            .find((candidate) => candidate.text().includes('navigation.label-login'));
        expect(login, 'login is not a link').toBeDefined();
        expect(
            wrapper
                .findAll('header button')
                .some((b) => b.text().includes('navigation.label-login'))
        ).toBe(false);
    });

    /**
     * A badge with no `label` is announced as "Badge" — a number with no subject. The label is
     * the plural form of the count, so "3" reads as "3 items".
     */
    it('names the nav badge after its count', () => {
        publicCount.value = 3;

        const { wrapper } = mountNav();

        // `data-test` lands on the wrapper; Vuetify puts the name on the badge element inside.
        const badge = wrapper.find('[data-test="nav-badge"] .v-badge__badge');
        expect(badge.exists()).toBe(true);
        expect(badge.attributes('aria-label')).toBe('navigation.badge-items:3');
    });

    it('renders no badge, and therefore no label, for a zero count', () => {
        const { wrapper } = mountNav();

        expect(wrapper.find('[data-test="nav-badge"]').exists()).toBe(false);
    });

    /**
     * The hamburger and the drawer are wired to each other (WCAG 4.1.2): `aria-controls` names
     * the drawer, `aria-expanded` follows its state, and the drawer carries a label of its own,
     * distinct from the desktop nav's, so the two landmarks can be told apart.
     */
    it('declares the drawer it controls and whether it is open', () => {
        const { wrapper } = mountNav();

        const hamburger = wrapper.find('header button[aria-controls="app-drawer"]');
        expect(hamburger.exists()).toBe(true);
        expect(hamburger.attributes('aria-expanded')).toBe('false');
        expect(wrapper.find('#app-drawer').attributes('aria-label')).toBe(
            'navigation.label-drawer'
        );

        return hamburger.trigger('click').then(() => {
            expect(hamburger.attributes('aria-expanded')).toBe('true');
        });
    });

    it('closes the drawer on Escape and returns focus to the hamburger', () => {
        const { wrapper } = mountNav();
        const hamburger = wrapper.find('header button[aria-controls="app-drawer"]');

        return (
            hamburger
                .trigger('click')
                // Let the drawer take focus first, as it does for a real visitor, so the return
                // trip is what is asserted rather than a focus that never left.
                .then(() =>
                    vi.waitFor(() => expect(document.activeElement).not.toBe(document.body))
                )
                .then(() => wrapper.find('#app-drawer').trigger('keydown', { key: 'Escape' }))
                .then(() =>
                    vi.waitFor(() => expect(hamburger.attributes('aria-expanded')).toBe('false'))
                )
                .then(() =>
                    vi.waitFor(() => expect(document.activeElement).toBe(hamburger.element))
                )
        );
    });
});
