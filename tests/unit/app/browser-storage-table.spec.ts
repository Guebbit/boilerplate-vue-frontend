/**
 * `BrowserStorageTable` — the privacy page's "Cookies and storage" section: one row per item the
 * deployment can hold, the cells as translation keys, and Cloudflare named only when the human
 * check is Turnstile.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import BrowserStorageTable from '@/app/components/BrowserStorageTable.vue';
import vuetify from '@/ui/vuetify';

const { provider, analytics, faro } = vi.hoisted(() => ({
    provider: { value: 'none' },
    analytics: { value: false },
    faro: { value: false }
}));

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return { ...actual, useI18n: () => ({ t: (key: string) => key }) };
});
vi.mock('@/infrastructure/http/antibot.ts', () => ({
    fetchAntibotConfig: () => Promise.resolve({ data: { provider: provider.value } })
}));
vi.mock('@/infrastructure/analytics-consent.ts', () => ({
    isAnalyticsConsentEnabled: () => analytics.value
}));
vi.mock('@/infrastructure/observability/config.ts', () => ({
    readFaroConfig: () => (faro.value ? { url: 'https://faro.test' } : undefined)
}));

/** Mounts the section and waits for the human-check read to settle. */
const mountTable = async () => {
    const wrapper = mount(BrowserStorageTable, { global: { plugins: [vuetify] } });
    await flushPromises();
    return wrapper;
};

beforeEach(() => {
    provider.value = 'none';
    analytics.value = false;
    faro.value = false;
});

describe('BrowserStorageTable', () => {
    it('is the #cookies section, with a row per item and the cell text as keys', async () => {
        const wrapper = await mountTable();

        expect(wrapper.find('section#cookies').exists()).toBe(true);
        const row = wrapper.find('[data-test="storage-row-toursSeen"]');
        expect(row.text()).toContain('toursSeen');
        expect(row.text()).toContain('browser-storage.rows.toursSeen.purpose');
        expect(row.text()).toContain('browser-storage.rows.toursSeen.lifetime');
    });

    it('names the checkout draft as followed by an account id', async () => {
        const wrapper = await mountTable();
        const row = wrapper.find('[data-test="storage-row-checkoutDraft"]');

        expect(row.text()).toContain('checkout-draft:');
        expect(row.text()).toContain('browser-storage.checkout-draft-suffix');
    });

    it('shows the consent rows only when analytics is configured', async () => {
        const without = await mountTable();
        expect(without.find('[data-test="storage-row-analyticsConsent"]').exists()).toBe(false);

        analytics.value = true;
        faro.value = true;
        const wrapper = await mountTable();

        expect(wrapper.find('[data-test="storage-row-analyticsConsent"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="storage-row-faroNavigation"]').exists()).toBe(true);
    });

    it('names Cloudflare as a third party only when the human check is Turnstile', async () => {
        const other = await mountTable();
        expect(other.find('[data-test="browser-storage-turnstile"]').exists()).toBe(false);

        provider.value = 'turnstile';
        const turnstile = await mountTable();

        expect(turnstile.find('[data-test="browser-storage-turnstile"]').exists()).toBe(true);
    });
});
