/**
 * `TermsPage` — names the version of the Terms in force, as `GET /shop` states it, once the shop
 * has loaded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { getShop } from '@api';
import TermsPage from '@/app/views/TermsPage.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { resetShop } from '@/infrastructure/shop.ts';
import { aShop } from '../../support/unit/fixtures.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getShop: vi.fn()
}));

beforeEach(() => {
    resetShop();
    vi.mocked(getShop).mockReset();
    return loadLocale('en');
});

describe('TermsPage', () => {
    it('shows the Terms version the shop states', () => {
        vi.mocked(getShop).mockResolvedValue({
            data: aShop({ termsVersion: '2026-10' })
        } as Awaited<ReturnType<typeof getShop>>);
        const wrapper = mount(TermsPage, {
            global: { plugins: [vuetify, i18n], stubs: { StaticPageLinks: true } }
        });

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test="terms-version"]').text()).toBe('Version 2026-10');
        });
    });

    it('shows no version before the shop has loaded', () => {
        vi.mocked(getShop).mockReturnValue(new Promise(() => undefined));
        const wrapper = mount(TermsPage, {
            global: { plugins: [vuetify, i18n], stubs: { StaticPageLinks: true } }
        });

        expect(wrapper.find('[data-test="terms-version"]').exists()).toBe(false);
    });
});
