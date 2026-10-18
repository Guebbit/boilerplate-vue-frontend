/**
 * `SellerIdentityBlock` — the trader identity e-Commerce Directive Art. 5 wants on the site:
 * nothing until the shop loads, every required field after, and the VAT number, trade register and
 * registration number only when the shop has them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { getShop } from '@api';
import SellerIdentityBlock from '@/app/components/SellerIdentityBlock.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { resetShop } from '@/infrastructure/shop.ts';
import { aShop } from '../../support/unit/fixtures.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getShop: vi.fn()
}));

/** Makes `GET /shop` answer with a shop carrying these fields. */
const shopAnswers = (overrides: Parameters<typeof aShop>[0]) =>
    vi
        .mocked(getShop)
        .mockResolvedValue({ data: aShop(overrides) } as Awaited<ReturnType<typeof getShop>>);

/** Mounts the block, waits for the shop read to land, and returns the text of its rows. */
const renderedText = (): Promise<string> => {
    const wrapper = mount(SellerIdentityBlock, { global: { plugins: [vuetify, i18n] } });
    return flushPromises().then(() => wrapper.get('[data-test="seller-identity"]').text());
};

beforeEach(() => {
    resetShop();
    vi.mocked(getShop).mockReset();
    return loadLocale('en');
});

describe('SellerIdentityBlock', () => {
    it('renders nothing while the shop is unknown', () => {
        vi.mocked(getShop).mockReturnValue(new Promise(() => undefined));

        const wrapper = mount(SellerIdentityBlock, { global: { plugins: [vuetify, i18n] } });

        expect(wrapper.find('[data-test="seller-identity"]').exists()).toBe(false);
    });

    it('shows the name, address, email and phone of the seller', async () => {
        shopAnswers({});

        const text = await renderedText();

        expect(text).toContain('Guebbit Demo Shop Srl');
        expect(text).toContain('Via Roma 1, 20100 Milano, IT');
        expect(text).toContain('shop@example.com');
        expect(text).toContain('+39 02 1234567');
    });

    it('shows the VAT number, trade register and registration number when the shop has them', async () => {
        shopAnswers({
            vatNumber: 'IT12345678901',
            tradeRegister: 'Registro Imprese di Milano',
            registrationNumber: 'MI-998877'
        });

        const text = await renderedText();

        expect(text).toContain('IT12345678901');
        expect(text).toContain('Registro Imprese di Milano');
        expect(text).toContain('MI-998877');
    });

    it('leaves out the rows the shop has no value for', async () => {
        shopAnswers({});

        const text = await renderedText();

        expect(text).not.toContain('VAT number');
        expect(text).not.toContain('Trade register');
        expect(text).not.toContain('Registration number');
    });
});
