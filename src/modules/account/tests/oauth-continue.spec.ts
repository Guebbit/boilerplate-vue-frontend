/**
 * @module
 * FA15's OAuth half: `Login.vue`/`Signup.vue` must forward the page's own `?continue=` onto every
 * OAuth button's `href`, through the real `oauthStartUrl` (`oauth.spec.ts` already pins that
 * function's own `?continue=` encoding). The provider list is real too, off a mocked
 * `GET /account/oauth/providers` — same as `oauth.spec.ts`'s own transport mock — so the button
 * this suite reads actually renders.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import Login from '@/modules/account/views/Login.vue';
import Signup from '@/modules/account/views/Signup.vue';
import type { Component } from 'vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { orvalMutator } from '@/infrastructure/http';
import { instance } from '@/infrastructure/http/client.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const RESPONSES: Record<string, unknown> = {
    'GET /account/oauth/providers': orvalEnvelope({ providers: ['google'] })
};

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, RESPONSES[key]));
    })
}));

let currentQuery: Record<string, unknown> = {};

vi.mock('vue-router', () => ({
    RouterLink: { template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: currentQuery }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

/**
 * Mounts a login/signup view with the plugins and stub it needs, and waits out the provider fetch
 * both views issue on mount.
 *
 * @param View - `Login` or `Signup`.
 */
const mountView = (View: Component) => {
    const wrapper = mount(View, {
        global: {
            plugins: [createPinia(), vuetify, i18n],
            stubs: {
                // Signup's human-check widget fetches its own config on mount — irrelevant here,
                // same stub `password-reset-request-view.spec.ts` uses for the same reason.
                HumanCheck: { template: '<div />' }
            }
        }
    });
    return flushPromises().then(() => wrapper);
};

beforeEach(() => {
    currentQuery = {};
    vi.mocked(orvalMutator).mockClear();
    instance.defaults.baseURL = '';
    return loadLocale('en').then(() => {
        i18n.global.locale.value = 'en';
    });
});

describe.each<[string, Component]>([
    ['Login', Login],
    ['Signup', Signup]
])('%s: the OAuth button href', (_name, View) => {
    it('carries a same-origin ?continue= from the page query', () => {
        currentQuery = { continue: '/cart' };
        return mountView(View).then((wrapper) => {
            expect(wrapper.get('[data-test=oauth-google]').attributes('href')).toBe(
                '/account/oauth/google?continue=%2Fcart&locale=en'
            );
        });
    });

    it('carries the active language as ?locale=, so a login with no continue target keeps it', () =>
        loadLocale('it')
            .then(() => {
                i18n.global.locale.value = 'it';
                return mountView(View);
            })
            .then((wrapper) => {
                expect(wrapper.get('[data-test=oauth-google]').attributes('href')).toBe(
                    '/account/oauth/google?locale=it'
                );
            }));

    it('omits ?continue= when the page has none', () =>
        mountView(View).then((wrapper) => {
            expect(wrapper.get('[data-test=oauth-google]').attributes('href')).toBe(
                '/account/oauth/google?locale=en'
            );
        }));

    it('omits ?continue= for a protocol-relative value (an open-redirect attempt)', () => {
        currentQuery = { continue: '//evil.example' };
        return mountView(View).then((wrapper) => {
            expect(wrapper.get('[data-test=oauth-google]').attributes('href')).toBe(
                '/account/oauth/google?locale=en'
            );
        });
    });

    it('omits ?continue= for a repeated query param (an array, not a string)', () => {
        currentQuery = { continue: ['/cart', '/checkout'] };
        return mountView(View).then((wrapper) => {
            expect(wrapper.get('[data-test=oauth-google]').attributes('href')).toBe(
                '/account/oauth/google?locale=en'
            );
        });
    });
});
