/**
 * `Error.vue` (FA131) — the shell's own catch-all page, never mounted anywhere before this. Its
 * whole job: show the `status`/`message` the router handed it, translating `message` only when it
 * looks like one of THIS app's own i18n keys (`error-page.*`/`navigation.*`), and folding anything
 * else into the generic key instead of showing it verbatim (FA74) — `router.onError` already does
 * the same fold before pushing here, so this is the view's own defence, not the only one — plus a
 * locale-prefixed way back Home.
 *
 * `LayoutDefault` mounts as the route's own layout now (FA70), not by this view — nothing here
 * stubs it, since this view no longer renders it at all.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import ErrorPage from '@/app/views/Error.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';

const routes: RouteRecordRaw[] = [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TypeScript-ESLint cannot fully resolve ErrorPage's own .vue SFC type; an explicit RouteRecordRaw[] target does not rescue it
    { path: '/:locale/error', name: 'ErrorPage', component: ErrorPage, props: true },
    { path: '/:locale', name: 'Home', component: { template: '<div>home</div>' } }
];

const router = createRouter({
    history: createMemoryHistory(),
    routes
});

const mountError = (query: Record<string, string>) => {
    return router.push({ name: 'ErrorPage', params: { locale: 'en' }, query }).then(() =>
        mount(ErrorPage, {
            props: { status: query.status, message: query.message },
            global: { plugins: [vuetify, i18n, router] }
        })
    );
};

beforeEach(() => loadLocale('en'));

describe('Error page', () => {
    it('carries its own id on its own root, not through LayoutDefault’s $attrs (FA70)', () =>
        mountError({ status: '404' }).then((wrapper) => {
            expect(wrapper.attributes('id')).toBe('error-page');
        }));

    it('shows the status in the title', () =>
        mountError({ status: '404' }).then((wrapper) => {
            expect(wrapper.get('h1').text()).toContain('404');
        }));

    it("translates a message that looks like this app's own i18n key", () =>
        mountError({ message: 'error-page.not-found' }).then((wrapper) => {
            expect(wrapper.text()).not.toContain('error-page.not-found');
        }));

    it('folds free-form router text into the generic message, never showing it verbatim', () =>
        mountError({ message: 'Network Error: fetch failed' }).then((wrapper) => {
            expect(wrapper.text()).not.toContain('Network Error: fetch failed');
        }));

    it('shows the generic message when the router carried no message at all', () =>
        mountError({ status: '500' }).then((wrapper) => {
            expect(wrapper.text().trim().length).toBeGreaterThan(0);
        }));

    it('links back Home, under the current locale', () =>
        mountError({ status: '404' }).then((wrapper) => {
            expect(wrapper.get('a').attributes('href')).toBe('/en');
        }));
});
