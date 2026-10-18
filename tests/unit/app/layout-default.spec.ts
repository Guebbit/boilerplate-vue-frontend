/**
 * @module
 * `LayoutDefault.vue` — the shell the router now mounts once, as the layout for every
 * route, reading the hero's title/opt-out/centering straight off the matched route's own `meta`
 * instead of props a view used to pass it. The chrome components (`AppNavigation`, both banners,
 * the dialog hosts) are stubbed: none of that is this file's own behaviour, already proven by
 * their own specs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAnalyticsConsentStore } from '@/infrastructure/analytics-consent.ts';
import { STATIC_PAGES, staticPageRouteName } from '@/app/utils/static-pages.ts';
import { getShop } from '@api';
import { loadShop, resetShop } from '@/infrastructure/shop.ts';
import { aShop } from '../../support/unit/fixtures.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getShop: vi.fn()
}));

/** A trivial leaf component, so `<RouterView />` has something real to render. */
const leaf = (text: string) => ({ template: `<p>${text}</p>` });

/** Memory-history router the layout mounts under. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/plain',
            name: 'Plain',
            meta: { title: 'home-page.page-title' },
            component: leaf('plain content')
        },
        {
            path: '/custom',
            name: 'Custom',
            meta: { title: 'home-page.page-title', customHero: true, centered: true },
            component: leaf('custom content')
        },
        {
            path: '/no-title',
            name: 'NoTitle',
            component: leaf('untitled content')
        },
        // LayoutDefault's own footer cross-links the four prose pages by name — real routes the
        // real router declares, needed here purely so `RouterLink` has something to resolve.
        ...STATIC_PAGES.map((page) => ({
            path: `/${page}`,
            name: staticPageRouteName(page),
            component: leaf(page)
        }))
    ]
});

/** The layout's chrome components, stubbed so only the shell itself is under test. */
const CHROME_STUBS = {
    AppNavigation: true,
    AppHealthBanner: true,
    AppVerificationBanner: true,
    AppAnalyticsConsentBanner: true,
    DialogHost: true,
    ReauthDialog: true
};

/** Mounts the layout with the real i18n, Vuetify and router. */
const mountLayout = () =>
    mount(LayoutDefault, {
        global: { plugins: [vuetify, i18n, router], stubs: CHROME_STUBS }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('LayoutDefault — the hero', () => {
    it("renders the matched route's title, translated, when it opts into nothing special", () =>
        router.push('/plain').then(() => {
            const wrapper = mountLayout();

            expect(wrapper.get('h1').text()).toBe('Home');
        }));

    it('renders no generic hero at all for a route that opted out (customHero)', () =>
        router.push('/custom').then(() => {
            const wrapper = mountLayout();

            expect(wrapper.find('h1').exists()).toBe(false);
        }));

    it('renders no hero for a route with no title at all', () =>
        router.push('/no-title').then(() => {
            const wrapper = mountLayout();

            expect(wrapper.find('h1').exists()).toBe(false);
        }));
});

describe('LayoutDefault — the matched view', () => {
    it('renders whichever route actually matched, through its own RouterView', () =>
        router.push('/plain').then(() => {
            expect(mountLayout().text()).toContain('plain content');
        }));

    it('centers the content column only when the route asks for it', () =>
        router.push('/custom').then(() => {
            const wrapper = mountLayout();

            expect(wrapper.text()).toContain('custom content');
            expect(wrapper.html()).toContain('min-h-[60dvh]');
        }));

    it('does not center an ordinary route', () =>
        router.push('/plain').then(() => {
            expect(mountLayout().html()).not.toContain('min-h-[60dvh]');
        }));
});

describe('LayoutDefault — a session that died on its own', () => {
    it('says so and re-enters the current route through the guard, forced past the duplicate check', () =>
        router.push('/plain?tab=1').then(() => {
            const replace = vi.spyOn(router, 'replace');
            mountLayout();

            useSessionStore().expiredSignal += 1;

            return flushPromises().then(() => {
                expect(useNotificationsStore().messages.map((entry) => entry.message)).toContain(
                    'Your session has expired. Please sign in again.'
                );
                expect(replace).toHaveBeenCalledWith(
                    expect.objectContaining({ path: '/plain', query: { tab: '1' }, force: true })
                );
            });
        }));

    it('does nothing for an explicit logout, which never bumps the signal', () =>
        router.push('/plain').then(() => {
            const replace = vi.spyOn(router, 'replace');
            replace.mockClear();
            mountLayout();

            useSessionStore().clearSession();

            return flushPromises().then(() => {
                expect(replace).not.toHaveBeenCalled();
            });
        }));
});

/** Mounts the layout once `GET /shop` has answered with these fields. */
const mountWithShop = (overrides: Parameters<typeof aShop>[0]) => {
    vi.mocked(getShop).mockResolvedValue({ data: aShop(overrides) } as Awaited<
        ReturnType<typeof getShop>
    >);
    return router.push('/plain').then(() => {
        const wrapper = mountLayout();
        return loadShop()
            .then(() => flushPromises())
            .then(() => wrapper);
    });
};

describe('LayoutDefault — the seller line', () => {
    beforeEach(() => resetShop());

    it('is not drawn until the shop has loaded', () => {
        vi.mocked(getShop).mockReturnValue(new Promise(() => undefined));

        return router.push('/plain').then(() => {
            expect(mountLayout().find('[data-test="footer-seller"]').exists()).toBe(false);
        });
    });

    it('prints the legal name and the VAT number on every page', () =>
        mountWithShop({ vatNumber: 'IT12345678901' }).then((wrapper) => {
            expect(wrapper.get('[data-test="footer-seller"]').text()).toBe(
                '© Guebbit Demo Shop Srl · VAT IT12345678901'
            );
        }));

    it('prints the name alone for a shop with no VAT number', () =>
        mountWithShop({}).then((wrapper) => {
            expect(wrapper.get('[data-test="footer-seller"]').text()).toBe(
                '© Guebbit Demo Shop Srl'
            );
        }));

    it('links the Legal notice page next to the other prose pages', () =>
        router.push('/plain').then(() => {
            expect(mountLayout().get('footer').text()).toContain('Legal notice');
        }));
});

describe('LayoutDefault — the privacy choices link', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is absent when neither Umami nor Faro is configured', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
        vi.stubEnv('VITE_FARO_URL', '');

        return router.push('/plain').then(() => {
            expect(mountLayout().find('[data-test="privacy-choices-link"]').exists()).toBe(false);
        });
    });

    it('reopens the consent banner of an answered visitor', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
        useAnalyticsConsentStore().grant();
        expect(useAnalyticsConsentStore().promptOpen).toBe(false);

        return router
            .push('/plain')
            .then(() => mountLayout().get('[data-test="privacy-choices-link"]').trigger('click'))
            .then(() => {
                expect(useAnalyticsConsentStore().promptOpen).toBe(true);
            });
    });
});
