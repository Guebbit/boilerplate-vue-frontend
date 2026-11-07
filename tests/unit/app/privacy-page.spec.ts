/**
 * `PrivacyPage` — opens with the operator's identity: the controller GDPR Art. 13(1)(a) names, on
 * a site that may have no shop.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { Ref } from 'vue';
import PrivacyPage from '@/app/views/PrivacyPage.vue';
import { publicConfig } from '@/infrastructure/config.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { configAnswer } from '../../support/unit/config-answer.ts';

vi.mock('@/infrastructure/config.ts', async () => {
    const { ref } = await import('vue');
    return {
        publicConfig: ref(),
        loadConfig: vi.fn(() => Promise.resolve()),
        resetConfig: vi.fn()
    };
});

beforeEach(() => {
    (publicConfig as Ref<unknown>).value = undefined;
    return loadLocale('en');
});

describe('PrivacyPage', () => {
    it('shows who the controller is once the config has loaded', () => {
        // `publicConfig` is a plain ref under the mock above; the single cast bridges the readonly type.
        (publicConfig as Ref<unknown>).value = configAnswer();
        const wrapper = mount(PrivacyPage, {
            global: {
                plugins: [vuetify, i18n],
                stubs: { StaticPageLinks: true, BrowserStorageTable: true }
            }
        });

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test="operator-identity"]').text()).toContain(
                'Guebbit Demo Shop Srl'
            );
        });
    });
});
