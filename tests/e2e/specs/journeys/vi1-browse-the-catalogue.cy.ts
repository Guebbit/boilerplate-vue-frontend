// requires-module: products
/**
 * @module
 * VI1 · Browse the catalogue like a person. A guest narrows the shop by a tag and a price band,
 * orders it, changes the page size and turns the page, then does what people do with a filtered
 * view: reload it, leave and come Back, paste the address into a fresh visit. Reset clears it all,
 * and a search for nonsense ends in the empty state.
 *
 * Every expectation is derived from the public list the API serves (`cy.publicProducts`), so the
 * story keeps holding as the seed grows; nothing names a product, a tag or a price. The URL is the
 * state: it is read back after every move, since "share this view" is the whole point of it.
 */
import { cents } from '../../../support/e2e/steps';

/** The page size the storefront starts with. */
const DEFAULT_PAGE_SIZE = 10;

/** The larger page size the story switches to: the second of the select's options. */
const LARGE_PAGE_SIZE = 25;

/** The slice of a product this story reads off the public list. */
interface Listed {
    title: string;
    price: number;
    tags?: string[];
}

/**
 * The tag a story can narrow by: present on several products but not on all of them, most
 * populated first, so the band below has something to cut.
 *
 * @param products - the whole public catalogue
 */
const pickTag = (products: readonly Listed[]): { tag: string; carrying: Listed[] } => {
    const counts = new Map<string, number>();
    for (const product of products)
        for (const tag of product.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const [tag] = [...counts.entries()]
        .filter(([, count]) => count >= 4 && count < products.length)
        .toSorted((a, b) => b[1] - a[1])
        .map(([name]) => name);
    expect(tag, 'a tag on at least four products, but not all').to.be.a('string');
    return { tag, carrying: products.filter((product) => product.tags?.includes(tag)) };
};

/**
 * The prices on the cards currently shown, in cents, in screen order.
 */
const shownPrices = (): Cypress.Chainable<number[]> =>
    cy
        .get('[data-test=product-card-price]')
        .then(($prices) => [...$prices].map((element) => cents(element.textContent)));

/**
 * The titles on the cards currently shown, in screen order.
 */
const shownTitles = (): Cypress.Chainable<string[]> =>
    cy
        .get('[data-test=product-card-link]')
        .then(($links) => [...$links].map((element) => element.textContent.trim()));

/**
 * Picks the nth option of a `v-select` by position: the options carry no `data-test`, and their
 * wording is copy. The sort select offers [newest, price up, price down, name A-Z, name Z-A].
 *
 * @param select - the select's `data-test` selector
 * @param position - zero-based position in the option list
 */
const chooseOption = (select: string, position: number): void => {
    cy.get(select).click();
    cy.get('.v-overlay-container .v-list-item').eq(position).click();
};

/**
 * Waits for the list request a filter change fires, so the next read is of the new rows.
 */
const settled = (): void => {
    cy.wait('@catalogue');
    cy.get('[data-test=products-grid][aria-busy=true]').should('not.exist');
};

describe('VI1 · Browse the catalogue like a person', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.intercept('POST', '**/products/search').as('catalogue');
        cy.visit('/en/products');
        // The list's own first load, so the waits in the story count only the moves it makes.
        cy.wait('@catalogue');
        cy.get('[data-test=product-card]').should('have.length.at.least', 1);
    });

    it('filters, orders and pages, keeps the view in its address, and ends in an honest empty state', () => {
        cy.publicProducts().then((products) => {
            const { tag, carrying } = pickTag(products);
            const prices = carrying
                .map((product) => Math.round(product.price * 100))
                .toSorted((a, b) => a - b);
            // A band that drops the cheapest and the dearest, so both edges are proven.
            const low = prices[1];
            const high = prices.at(-2) ?? low;
            const inBand = carrying.filter((product) => {
                const inCents = Math.round(product.price * 100);
                return inCents >= low && inCents <= high;
            });

            // The band must cut something at each edge, or the price step proves nothing.
            expect(inBand.length, 'a band narrower than the tag').to.be.lessThan(carrying.length);
            expect(inBand.length, 'a band that still holds something').to.be.greaterThan(0);

            cy.step('a tag chip narrows the shelf to what carries it');
            cy.contains('[data-test=tag-chip]', `${tag} (${String(carrying.length)})`).click();
            settled();
            cy.get('[data-test=product-card]').should(
                'have.length',
                Math.min(carrying.length, DEFAULT_PAGE_SIZE)
            );
            cy.location('search').should('include', `tag=${tag}`);

            cy.step('a price band keeps only what falls inside it');
            cy.get('[data-test=filter-min-price] input').type(String(low / 100));
            cy.get('[data-test=filter-max-price] input').type(String(high / 100));
            cy.get('#products-list-page form [type=submit]').click();
            settled();
            cy.get('[data-test=product-card]').should(
                'have.length',
                Math.min(inBand.length, DEFAULT_PAGE_SIZE)
            );
            shownPrices().should((shown) => {
                for (const price of shown) expect(price).to.be.within(low, high);
            });

            cy.step('the cards say what is on the shelf, and tell a guest how to buy');
            cy.get('[data-test=product-card]').each(($card) => {
                cy.wrap($card).find('[data-test=product-card-availability]').should('exist');
                cy.wrap($card).find('[data-test=product-card-login]').should('exist');
            });

            cy.step('every picture loads, or shows the placeholder instead');
            cy.get('[data-test=product-card] [data-test=lazy-image]').each(($image) => {
                cy.wrap($image).scrollIntoView();
                cy.wrap($image).should(($box) => {
                    const main = $box.find('img:not([data-test=lazy-image-thumbnail])')[0];
                    const placeholder = $box.attr('data-placeholder') === 'true';
                    expect(
                        placeholder || (main as HTMLImageElement).naturalWidth > 0,
                        'a picture that loaded, or the placeholder'
                    ).to.equal(true);
                });
            });

            cy.step('sorted by price, highest first, then by name');
            chooseOption('[data-test=sort-select]', 2);
            settled();
            cy.location('search').should('include', 'sort=-price');
            shownPrices().should((shown) => {
                expect(shown).to.deep.equal(shown.toSorted((a, b) => b - a));
            });
            chooseOption('[data-test=sort-select]', 3);
            settled();
            cy.location('search').should('include', 'sort=title');
            shownTitles().should((shown) => {
                const collator = new Intl.Collator('en');
                expect(shown).to.deep.equal(shown.toSorted(collator.compare));
            });
        });

        cy.step('the address carries the whole view, and a reload restores it');
        cy.location('search').should('include', 'tag=').and('include', 'minPrice=');
        cy.location('href').then((shared) => {
            shownTitles().then((before) => {
                cy.reload();
                cy.get('[data-test=product-card]').should('have.length.at.least', 1);
                shownTitles().should('deep.equal', before);
                cy.get('[data-test=tag-chip][aria-pressed=true]').should('have.length', 1);
                cy.get('[data-test=filter-min-price] input').should('not.have.value', '');

                cy.step('leaving for a product and coming Back lands on the same view');
                cy.get('[data-test=product-card-link]').first().click();
                cy.get('#product-target').should('exist');
                cy.go('back');
                cy.get('[data-test=product-card]').should('have.length.at.least', 1);
                shownTitles().should('deep.equal', before);

                cy.step('the copied address, opened fresh, shows the same view');
                cy.visit('/en');
                cy.visit(shared);
                cy.get('[data-test=product-card]').should('have.length.at.least', 1);
                shownTitles().should('deep.equal', before);
            });
        });

        cy.step('Reset clears every filter, the address and the ordering');
        cy.contains('#products-list-page button', 'Reset').click();
        cy.wait('@catalogue');
        cy.location('search').should('equal', '');
        cy.get('[data-test=tag-chip][aria-pressed=true]').should('not.exist');
        cy.get('[data-test=product-card]').should('have.length', DEFAULT_PAGE_SIZE);

        cy.step('a larger page size shows more, and the next page shows the rest');
        chooseOption('[data-test=page-size]', 1);
        cy.get('[data-test=product-card]').should('have.length', LARGE_PAGE_SIZE);
        cy.location('search').should('include', `pageSize=${String(LARGE_PAGE_SIZE)}`);
        shownTitles().then((firstPage) => {
            cy.get('.v-pagination__next button').click();
            cy.location('search').should('include', 'page=2');
            cy.publicProducts().then((products) => {
                expect(products.length, 'a catalogue longer than one large page').to.be.greaterThan(
                    LARGE_PAGE_SIZE
                );
                cy.get('[data-test=product-card]').should(
                    'have.length',
                    Math.min(products.length - LARGE_PAGE_SIZE, LARGE_PAGE_SIZE)
                );
            });
            shownTitles().should((secondPage) => {
                for (const title of secondPage) expect(firstPage).to.not.include(title);
            });
        });

        cy.step('a search for nonsense ends in the empty state, not a blank page');
        cy.get('[data-test=filter-text] input').type('zzzz-no-such-product-zzzz{enter}');
        cy.get('[data-test=products-empty]').should('exist');
        cy.get('[data-test=product-card]').should('not.exist');
    });
});
