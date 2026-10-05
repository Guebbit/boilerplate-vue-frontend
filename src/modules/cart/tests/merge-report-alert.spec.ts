/**
 * @module
 * The merge alert on its own: it shows nothing until a merge changed something, then lists each
 * changed, short or gone line with the product's name, what was asked and what the cart holds; a
 * short line is marked and told to be lowered, and no line ever prints a stock number; the shopper
 * can close it; and it is ONE polite live region. The products lookup is the real composable over
 * the real products store, with its network read stubbed to answer from a small catalogue.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import axe from 'axe-core';
import MergeReportAlert from '@/modules/cart/components/MergeReportAlert.vue';
import { useCartStore } from '@/modules/cart/store';
import type { MergeReportLine } from '@/modules/cart/domain';
import { useProductsStore } from '@/modules/products';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { aProduct } from '../../../../tests/support/unit/fixtures.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Product } from '@types';

wireModulesIntoCore();

/**
 * What the products read can still return, by id.
 */
let catalogue: Record<string, Product>;

/**
 * The mounted alert, unmounted after each case.
 */
let wrapper: VueWrapper | undefined;

/**
 * Mounts the alert over a store holding `report`, with the products read answering from
 * `catalogue`.
 *
 * @param report - What the last merge changed.
 * @returns The store and the read stub, once the first read has settled.
 */
const mountAlert = async (report: MergeReportLine[]) => {
    const products = useProductsStore();
    const read = vi.spyOn(products, 'fetchProductsByIds').mockImplementation((ids) => {
        for (const id of ids) {
            const product = catalogue[id];
            if (product) products.addProduct(product);
        }
        return Promise.resolve([]);
    });
    const cart = useCartStore();
    cart.mergeReport = report;
    wrapper = mount(MergeReportAlert, {
        global: { plugins: [vuetify, i18n] },
        attachTo: document.body
    });
    await flushPromises();
    return { cart, read };
};

/**
 * A report line: as asked and in stock unless the case says otherwise.
 *
 * @param line - What differs from the default.
 * @returns The line as the store holds it.
 */
const aLine = (
    line: Partial<MergeReportLine> & Pick<MergeReportLine, 'productId'>
): MergeReportLine => ({ requested: 2, resulting: 2, insufficientStock: false, ...line });

/**
 * The text of every listed line.
 *
 * @returns The lines' text, whitespace collapsed.
 */
const lineTexts = (): string[] =>
    (wrapper?.findAll('[data-test=cart-merge-report-line]') ?? []).map((line) =>
        line.text().replaceAll(/\s+/g, ' ')
    );

beforeEach(() => {
    setActivePinia(createPinia());
    catalogue = {
        p1: aProduct({ id: 'p1', title: 'Blue mug' }),
        p2: aProduct({ id: 'p2', title: 'Red plate' })
    };
    return loadLocale('en');
});

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
});

describe('what it shows', () => {
    it('is absent while no merge changed anything', async () => {
        await mountAlert([]);

        expect(wrapper?.find('[data-test=cart-merge-report]').exists()).toBe(false);
    });

    it('lists each line with its product, what was asked and what the cart holds', async () => {
        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
            aLine({ productId: 'p2', requested: 4, resulting: 4, insufficientStock: true })
        ]);

        const texts = lineTexts();
        expect(texts).toHaveLength(2);
        expect(texts[0]).toContain('Blue mug: you chose 2, your cart now has 5.');
        expect(texts[1]).toContain('Red plate: you chose 4, your cart now has 4.');
    });

    it.each([
        ['summed', 'already held some of it'],
        ['capped', 'the most one line can hold'],
        ['unavailable', 'no longer available']
    ] as const)('says why in plain words for a line that is %s', async (reason, words) => {
        await mountAlert([aLine({ productId: 'p1', requested: 3, resulting: 3, reason })]);

        const line = wrapper?.get('[data-test=cart-merge-report-line]');
        expect(line?.attributes('data-reason')).toBe(reason);
        expect(line?.text()).toContain(words);
    });

    it('marks a short line and tells the shopper to lower it, without any stock number', async () => {
        await mountAlert([
            aLine({ productId: 'p2', requested: 4, resulting: 4, insufficientStock: true })
        ]);

        const line = wrapper?.get('[data-test=cart-merge-report-line]');
        expect(line?.attributes('data-kind')).toBe('short');
        expect(line?.get('[data-test=cart-merge-report-short]').text()).toBe('Not enough in stock');
        expect(line?.text()).toContain('Lower the quantity before checkout.');
        // The only digits on the line are the two quantities the shopper chose and holds.
        expect(line?.text().match(/\d+/g)).toEqual(['4', '4']);
    });

    it('says both things about a line that was summed and is short', async () => {
        await mountAlert([
            aLine({
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                insufficientStock: true
            })
        ]);

        const line = wrapper?.get('[data-test=cart-merge-report-line]');
        expect(line?.text()).toContain('already held some of it');
        expect(line?.find('[data-test=cart-merge-report-short]').exists()).toBe(true);
    });

    it('does not mark a gone product short, even if the flag came with it', async () => {
        await mountAlert([
            aLine({
                productId: 'gone',
                requested: 1,
                resulting: 0,
                reason: 'unavailable',
                insufficientStock: true
            })
        ]);

        const line = wrapper?.get('[data-test=cart-merge-report-line]');
        expect(line?.attributes('data-kind')).toBe('gone');
        expect(line?.find('[data-test=cart-merge-report-short]').exists()).toBe(false);
        expect(line?.text()).toContain('no longer available');
    });

    it('does not mark a line that only changed', async () => {
        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'capped' })
        ]);

        const line = wrapper?.get('[data-test=cart-merge-report-line]');
        expect(line?.attributes('data-kind')).toBe('changed');
        expect(line?.find('[data-test=cart-merge-report-short]').exists()).toBe(false);
    });

    it('reads the products it names, including one the cart no longer holds', async () => {
        const { read } = await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 2, reason: 'summed' }),
            aLine({ productId: 'gone', requested: 1, resulting: 0, reason: 'unavailable' })
        ]);

        expect(read).toHaveBeenCalledWith(['p1', 'gone']);
    });

    it("names a product by the title the lookup returns, and speaks the reader's language", async () => {
        catalogue = { p1: aProduct({ id: 'p1', title: 'Tazza blu' }) };
        await loadLocale('it');
        i18n.global.locale.value = 'it';

        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })
        ]);

        expect(lineTexts()[0]).toContain(
            'Tazza blu: avevi scelto 2, ora il carrello ne contiene 5.'
        );
        expect(wrapper?.get('[data-test=cart-merge-report]').text()).toContain(
            'Alcune righe non sono come le avevi scelte'
        );
        i18n.global.locale.value = 'en';
    });

    it("speaks the reader's language for a short line too", async () => {
        await loadLocale('it');
        i18n.global.locale.value = 'it';

        await mountAlert([
            aLine({ productId: 'p2', requested: 4, resulting: 4, insufficientStock: true })
        ]);

        expect(wrapper?.get('[data-test=cart-merge-report-short]').text()).toBe(
            'Disponibilità insufficiente'
        );
        expect(lineTexts()[0]).toContain('Riduci la quantità prima del pagamento.');
        i18n.global.locale.value = 'en';
    });

    it('falls back to a generic label for a product the lookup cannot return', async () => {
        await mountAlert([
            aLine({ productId: 'gone', requested: 1, resulting: 0, reason: 'unavailable' })
        ]);

        expect(lineTexts()[0]).toContain('A product: you chose 1, your cart now has 0.');
        expect(lineTexts()[0]).not.toContain('gone');
    });

    it('still shows the lines when the products read fails', async () => {
        const products = useProductsStore();
        vi.spyOn(products, 'fetchProductsByIds').mockRejectedValue(new Error('offline'));
        useCartStore().mergeReport = [
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })
        ];

        wrapper = mount(MergeReportAlert, {
            global: { plugins: [vuetify, i18n] },
            attachTo: document.body
        });
        await flushPromises();

        expect(lineTexts()[0]).toContain('A product: you chose 2, your cart now has 5.');
    });

    it('reads again, and shows the new lines, when a newer merge replaces the report', async () => {
        const { cart, read } = await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })
        ]);

        cart.mergeReport = [
            aLine({ productId: 'p2', requested: 9, resulting: 9, insufficientStock: true })
        ];
        await flushPromises();

        expect(read).toHaveBeenLastCalledWith(['p2']);
        expect(lineTexts()).toHaveLength(1);
        expect(lineTexts()[0]).toContain('Red plate: you chose 9, your cart now has 9.');
    });
});

describe('closing it', () => {
    it('empties the report in the store and removes the alert', async () => {
        const { cart } = await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })
        ]);

        await wrapper?.get('button[aria-label="Dismiss"]').trigger('click');
        await flushPromises();

        expect(cart.mergeReport).toEqual([]);
        expect(wrapper?.find('[data-test=cart-merge-report]').exists()).toBe(false);
    });
});

describe('for assistive technology', () => {
    it('is exactly one polite live region, however many lines it lists', async () => {
        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
            aLine({ productId: 'p2', requested: 4, resulting: 4, insufficientStock: true }),
            aLine({ productId: 'gone', requested: 1, resulting: 0, reason: 'unavailable' })
        ]);

        const root = wrapper?.get('[data-test=cart-merge-report]');
        expect(root?.attributes('role')).toBe('status');
        expect(root?.findAll('[role]')).toHaveLength(0);
        expect(root?.findAll('[aria-live]')).toHaveLength(0);
    });

    it('titles the alert and gives its close button a name', async () => {
        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })
        ]);

        expect(wrapper?.get('[data-test=cart-merge-report]').text()).toContain(
            'Your guest cart was added to your cart'
        );
        expect(wrapper?.find('button[aria-label="Dismiss"]').exists()).toBe(true);
    });

    it('breaks no accessibility rule axe can check without a rendered page', async () => {
        await mountAlert([
            aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
            aLine({ productId: 'p2', requested: 4, resulting: 4, insufficientStock: true }),
            aLine({ productId: 'gone', requested: 1, resulting: 0, reason: 'unavailable' })
        ]);

        // https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
        // `color-contrast` needs real layout and styles, which jsdom does not compute.
        const results = await axe.run(document.body, {
            rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
        });

        expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`)).toEqual([]);
    });
});
