// requires-module: account, observability, users
/**
 * @module
 * AT9 · The platform operator is not the shop. The operator holds one platform role and no shop
 * membership: it runs the installation (health, metrics, the realtime stream) and sees nothing
 * of the shop's customers. Its menu is the platform pages, and every shop page turns it back.
 * The seeded `root` is both an administrator and the operator, so root sees both halves.
 */
import {
    adminMenuLinks,
    eventually,
    isTurnedBack,
    refuseALogin,
    refusedWith
} from '../../../support/e2e/steps';
import { loginDevice } from '../../../support/e2e/harness';

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    actorRole: string;
    metadata?: { reason?: string };
}

/** A dotted-quad address: what the incident trail must not show the operator. */
const IPV4 = /\b\d{1,3}(?:\.\d{1,3}){3}\b/;

describe('AT9 · The platform operator is not the shop', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the operator gets the platform pages and none of the shop, and root gets both', () => {
        cy.step('the operator signs in: the menu is the platform pages only');
        cy.loginAs('operator');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/admin');
            expect(links).to.include('/en/playground/realtime');
            for (const shopPage of ['/users', '/audit', '/inventory', '/products', '/locales']) {
                expect(links, shopPage).to.not.include(`/en${shopPage}`);
            }
        });

        cy.step('the platform pages open');
        cy.visit('/en/admin');
        cy.get('#admin-page').should('exist');
        cy.get('[data-test=admin-tab-overview]').should('exist');

        cy.step('the shop pages turn the operator back, typed in by hand');
        isTurnedBack('/en/users');
        isTurnedBack('/en/audit');
        isTurnedBack('/en/inventory');

        cy.step('root is the shop owner and the operator: both halves');
        cy.switchUser('admin');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/admin');
            expect(links).to.include('/en/users');
            expect(links).to.include('/en/audit');
        });
        cy.visit('/en/admin');
        cy.get('#admin-page').should('exist');
        cy.visit('/en/users');
        cy.get('#users-list-page').should('exist');
    });
    it('the operator reads the incident trail with no addresses and no protected-role rows, and shops like anyone', () => {
        cy.step('two incidents: a refused sign-in, and support reaching for a staff account');
        refuseALogin();
        cy.accountInRole('warehouse').then(({ id: warehouseId }) => {
            loginDevice('support').then((device) => {
                refusedWith(
                    device,
                    'PATCH',
                    `/users/${warehouseId}`,
                    { phone: '+39 02 0000 0000' },
                    403,
                    'ROLE_MANAGEMENT_REQUIRED'
                );
            });

            cy.step('the operator’s overview is up');
            cy.loginAs('operator');
            cy.visit('/en/admin');
            cy.get('[data-test=admin-overview-refresh]').should('exist');

            cy.step('the audit tab shows the refused sign-in, its address replaced by a digest');
            cy.get('[data-test=admin-tab-audit]').click();
            cy.get('[data-test=filter-action] input').type('auth.login');
            cy.get('[data-test=search-submit]').click();
            cy.get('[data-test=list-row]').should(($rows) => {
                expect($rows.length).to.be.greaterThan(0);
                for (const row of $rows.toArray())
                    expect(row.textContent, 'the address cell').to.not.match(IPV4);
            });

            cy.step('a protected-role refusal is not on the operator’s trail');
            cy.get('[data-test=filter-action] input').clear();
            cy.get('[data-test=filter-action] input').type('security.forbidden');
            cy.get('[data-test=search-submit]').click();
            cy.get('[data-test=list-row]').should('not.exist');

            cy.step('the realtime stream connects and shows the snapshot');
            cy.visit('/en/playground/realtime');
            cy.get('[data-test=realtime-connect]').click();
            cy.get('[data-test=realtime-status]').should('contain.text', 'open');
            cy.get('[data-test=realtime-feed-summary]').should('contain.text', 'snapshot');

            cy.step('the operator is a customer of the shop: a basket, no orders, no staff list');
            cy.get('[data-test=pinned-Cart]').should('exist');
            cy.intercept('POST', '**/orders/search').as('ordersSearch');
            cy.visit('/en/orders');
            cy.wait('@ordersSearch');
            cy.get('[data-test=list-row]').should('not.exist');
            isTurnedBack('/en/sales/orders');

            cy.step('the administrator does see the protected-role refusal');
            cy.switchUser('admin');
            eventually(
                () =>
                    cy
                        .apiAs<{ items: AuditRowLike[] }>(
                            'admin',
                            'GET',
                            `/audit?target=${warehouseId}&pageSize=100`
                        )
                        .then((list) => list?.items ?? []),
                (rows) =>
                    rows.some(
                        (row) =>
                            row.action === 'security.forbidden' &&
                            row.actorRole === 'support' &&
                            row.metadata?.reason === 'role_protected'
                    )
            );
        });
    });
});
