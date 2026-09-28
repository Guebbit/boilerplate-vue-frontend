/**
 * `Error.vue` (FA131) — the shell's own catch-all page, never mounted anywhere before this. Its
 * whole job: show the `status`/`message` the router handed it, translating `message` only when it
 * looks like one of THIS app's own i18n keys (`error-page.*`/`navigation.*`) rather than the raw
 * free text `router.onError` supplies, and offer a locale-prefixed way back Home.
 *
 * `LayoutDefault` is stubbed — it is the whole app shell (nav, banners, the reauth dialog), and
 * none of that is this page's own behaviour.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import ErrorPage from '@/app/views/Error.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale/error', name: 'ErrorPage', component: ErrorPage, props: true },
        { path: '/:locale', name: 'Home', component: { template: '<div>home</div>' } }
    ]
});

const mountError = (query: Record<string, string>) => {
    return router.push({ name: 'ErrorPage', params: { locale: 'en' }, query }).then(() =>
        mount(ErrorPage, {
            props: { status: query.status, message: query.message },
            global: {
                plugins: [vuetify, i18n, router],
                stubs: { LayoutDefault: { template: '<div><slot name="header" /><slot /></div>' } }
            }
        })
    );
};

beforeEach(() => loadLocale('en'));

describe('Error page', () => {
    it('shows the status in the title', () =>
        mountError({ status: '404' }).then((wrapper) => {
            expect(wrapper.get('h1').text()).toContain('404');
        }));

    it("translates a message that looks like this app's own i18n key", () =>
        mountError({ message: 'error-page.not-found' }).then((wrapper) => {
            expect(wrapper.text()).not.toContain('error-page.not-found');
        }));

    it('shows free-form router text as-is, not run through translation', () =>
        mountError({ message: 'Network Error: fetch failed' }).then((wrapper) => {
            expect(wrapper.text()).toContain('Network Error: fetch failed');
        }));

    it('links back Home, under the current locale', () =>
        mountError({ status: '404' }).then((wrapper) => {
            expect(wrapper.get('a').attributes('href')).toBe('/en');
        }));
});
