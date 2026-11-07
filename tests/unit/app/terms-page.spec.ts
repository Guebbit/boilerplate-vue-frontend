/**
 * `TermsPage` — names the version of the Terms in force, as `GET /config` states it, once the
 * config has loaded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import TermsPage from '@/app/views/TermsPage.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { publicConfig } from '@/infrastructure/config.ts';
import { configAnswer } from '../../support/unit/config-answer.ts';

vi.mock('@/infrastructure/config.ts', async () => {
    const { ref } = await import('vue');
    return {
        publicConfig: ref(),
        loadConfig: vi.fn(() => Promise.resolve()),
        resetConfig: vi.fn()
    };
});

/**
 * Makes `GET /config` read as this answer. `publicConfig` is a plain ref under the mock above, and
 * the real one is a readonly view of the same shape; the single cast bridges that.
 */
const answerConfig = (answer: ReturnType<typeof configAnswer> | undefined): void => {
    (publicConfig as Ref<unknown>).value = answer;
};

beforeEach(() => {
    answerConfig(undefined);
    return loadLocale('en');
});

describe('TermsPage', () => {
    it('shows the Terms version the config states', () => {
        answerConfig(configAnswer({ termsVersion: '2026-10' }));
        const wrapper = mount(TermsPage, {
            global: { plugins: [vuetify, i18n], stubs: { StaticPageLinks: true } }
        });

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test="terms-version"]').text()).toBe('Version 2026-10');
        });
    });

    it('shows no version before the config has loaded', () => {
        const wrapper = mount(TermsPage, {
            global: { plugins: [vuetify, i18n], stubs: { StaticPageLinks: true } }
        });

        expect(wrapper.find('[data-test="terms-version"]').exists()).toBe(false);
    });
});
