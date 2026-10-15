/**
 * @module
 * The sign-in-wrap notice beside the provider buttons: a first sign-in with a provider creates the
 * account, so the terms must be in front of the visitor there. With providers, the notice and both
 * links render; with none, nothing renders at all.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import OAuthButtons from '../components/OAuthButtons.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** Which providers the mocked `GET /account/oauth/providers` answers with, set per test. */
let providers: string[] = [];

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(parseOrvalFixture(config.method, config.url, orvalEnvelope({ providers })))
    )
}));

vi.mock('vue-router', () => ({
    RouterLink: { props: ['to'], template: '<a><slot /></a>' },
    useRoute: () => ({ fullPath: '/', params: {}, query: {} }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

/** Mounts the block and waits out the provider fetch. */
const mountBlock = () => {
    const wrapper = mount(OAuthButtons, { global: { plugins: [createPinia(), vuetify, i18n] } });
    return flushPromises().then(() => wrapper);
};

beforeEach(() => loadLocale('en').then(() => (i18n.global.locale.value = 'en')));

describe('OAuthButtons', () => {
    it('shows the notice with a link to the terms and one to the privacy notice', () => {
        providers = ['google'];

        return mountBlock().then((wrapper) => {
            const notice = wrapper.get('[data-test=oauth-terms-notice]');
            expect(notice.text()).toContain('agree to the');
            expect(notice.text()).toContain('have read the');
            expect(notice.findAll('a')).toHaveLength(2);
        });
    });

    it('renders nothing when no provider is enabled', () => {
        providers = [];

        return mountBlock().then((wrapper) => {
            expect(wrapper.find('[data-test=oauth-terms-notice]').exists()).toBe(false);
            expect(wrapper.find('[data-test=oauth-google]').exists()).toBe(false);
        });
    });
});
