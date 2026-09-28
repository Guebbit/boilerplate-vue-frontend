/**
 * @module
 * `LayoutDefault.vue` (FA70) — the shell the router now mounts once, as the layout for every
 * route, reading the hero's title/opt-out/centering straight off the matched route's own `meta`
 * instead of props a view used to pass it. The chrome components (`AppNavigation`, both banners,
 * the dialog hosts) are stubbed: none of that is this file's own behaviour, already proven by
 * their own specs.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { STATIC_PAGES, staticPageRouteName } from '@/app/utils/static-pages.ts';

/** A trivial leaf component, so `<RouterView />` has something real to render. */
const leaf = (text: string) => ({ template: `<p>${text}</p>` });

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

const CHROME_STUBS = {
    AppNavigation: true,
    AppHealthBanner: true,
    AppVerificationBanner: true,
    AppAnalyticsConsentBanner: true,
    DialogHost: true,
    ReauthDialog: true
};

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
            expect(wrapper.html()).toContain('min-h-[60vh]');
        }));

    it('does not center an ordinary route', () =>
        router.push('/plain').then(() => {
            expect(mountLayout().html()).not.toContain('min-h-[60vh]');
        }));
});
