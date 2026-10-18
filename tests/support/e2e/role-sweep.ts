/// <reference types="cypress" />

import { createMongoAbility, type MongoAbility, type RawRuleOf } from '@casl/ability';
import { unpackRules, type PackRule } from '@casl/ability/extra';
import type { E2ERole } from '../scenario-description';
import { adminMenuLinks, isTurnedBack } from './steps';

/**
 * One sweep over a module's pages, once per staff persona: does each role get exactly the page,
 * the menu link and the buttons its rules allow?
 *
 * ── Why a sweep per module, and not one central spec ─────────────────────────────────────────
 * The same argument as `sweepA11y`: a central matrix would be deleted whole, or left naming
 * pages that no longer exist, the moment a module goes. It names no domain; callers pass their
 * own cases.
 *
 * ── Expected values are derived, never typed ─────────────────────────────────────────────────
 * The matrix already exists, in the roles yaml and the generated tables. Each persona's own
 * `GET /account/abilities` is evaluated the way `session.can` does it (both scopes, either
 * answers yes), so a hand-written row cannot go stale. That also proves the real seeded persona,
 * the packed rules, `implies:` and both scopes reach the browser intact.
 *
 * ── What it catches ──────────────────────────────────────────────────────────────────────────
 * A page an allowed persona opens must load with no 401 or 403 from the API: a route `meta.can`
 * that disagrees with the door its page calls is a defect only this notices.
 *
 * Buttons: only `session.can`-gated ones. `actions.*`-gated ones belong to journeys.
 */

/** A control whose presence follows one permission. */
export interface RoleSweepButton {
    /** A CSS selector for the control. */
    selector: string;
    /** `[action, subject]` the control is gated on. */
    can: readonly [action: string, subject: string];
}

/** One page, and the permission that opens it. */
export interface RoleSweepCase {
    /** What a failure reports. */
    name: string;
    /** The path, locale prefix included, or a function yielding one once the backend can be asked. */
    route: string | (() => Cypress.Chainable<string>);
    /** `[action, subject]` the page requires: allowed personas open it, the rest are turned back. */
    can: readonly [action: string, subject: string];
    /** The administration-menu link that must be present iff allowed. */
    menuHref?: string;
    /** A selector that exists once the page has rendered. */
    pageRoot: string;
    /** Controls whose presence follows a permission. */
    buttons?: readonly RoleSweepButton[];
}

/** The staff personas a sweep walks by default, plus the shopper who must be turned back. */
export const SWEEP_PERSONAS: readonly E2ERole[] = [
    'user',
    'editor',
    'moderator',
    'manager',
    'warehouse',
    'support',
    'operator',
    'admin'
];

/** What `GET /account/abilities` answers that a sweep reads: one packed rule list per scope. */
interface PackedAbilities {
    tenant?: unknown[];
    platform?: unknown[];
}

/** A persona's two abilities, asked the way `session.can` asks. */
interface Evaluator {
    /** Whether either scope grants the action on the subject. */
    can: (permission: readonly [string, string]) => boolean;
}

/**
 * Turns packed rules into a CASL ability.
 *
 * @param packed - one scope's rules as the endpoint returns them
 */
const abilityOf = (packed: unknown[] = []): MongoAbility =>
    createMongoAbility(unpackRules(packed as PackRule<RawRuleOf<MongoAbility>>[]));

/**
 * The persona's rules as the server publishes them, ready to ask.
 *
 * @param persona - the seeded account
 */
const evaluatorOf = (persona: E2ERole): Cypress.Chainable<Evaluator> =>
    cy.apiAs<PackedAbilities>(persona, 'GET', '/account/abilities').then((rules) => {
        const tenant = abilityOf(rules?.tenant);
        const platform = abilityOf(rules?.platform);
        return cy.wrap<Evaluator>(
            {
                can: ([action, subject]) =>
                    tenant.can(action, subject) || platform.can(action, subject)
            },
            { log: false }
        );
    });

/**
 * Whether the administration menu lists `href`. A persona with no menu (the shopper) lists none.
 *
 * @param href - the link to look for
 */
const menuHas = (href: string): Cypress.Chainable<boolean> =>
    cy
        .get('body', { log: false })
        .then(($body) =>
            $body.find('[data-test=admin-menu]').length > 0
                ? adminMenuLinks()
                : cy.wrap<string[]>([], { log: false })
        )
        .then((links) => links.includes(href));

/**
 * Asserts every button is present iff its permission is granted.
 *
 * @param buttons - the controls under test
 * @param evaluator - the persona's rules
 */
const expectButtons = (buttons: readonly RoleSweepButton[], evaluator: Evaluator): void => {
    for (const button of buttons)
        cy.get('body', { log: false }).should(($body) => {
            expect(
                ($body.get(0)?.querySelector(button.selector) ?? null) !== null,
                `${button.selector} present for ${button.can.join(' ')}`
            ).to.equal(evaluator.can(button.can));
        });
};

/**
 * Visits an allowed page and asserts it renders, keeps its path, calls no refused door, and
 * carries its menu link and permitted buttons.
 *
 * @param sweepCase - the page
 * @param path - the resolved path
 * @param evaluator - the persona's rules
 * @param refusals - the 401/403 statuses collected from the API so far
 */
const expectAllowed = (
    sweepCase: RoleSweepCase,
    path: string,
    evaluator: Evaluator,
    refusals: number[]
): void => {
    refusals.length = 0;
    cy.visit(path);
    cy.get(sweepCase.pageRoot).should('exist');
    cy.location('pathname').should('equal', path);
    cy.settleNetwork();
    cy.then(() => {
        expect(refusals, `${path}: API answers 401/403 while the page loaded`).to.deep.equal([]);
    });
    if (sweepCase.menuHref) {
        const href = sweepCase.menuHref;
        menuHas(href).should('equal', true);
    }
    expectButtons(sweepCase.buttons ?? [], evaluator);
};

/**
 * Visits a refused page and asserts the router turned the visitor back, with no menu link.
 *
 * @param sweepCase - the page
 * @param path - the resolved path
 */
const expectRefused = (sweepCase: RoleSweepCase, path: string): void => {
    isTurnedBack(path);
    if (sweepCase.menuHref) menuHas(sweepCase.menuHref).should('equal', false);
};

/**
 * Walks every case as one persona: allowed or refused as the persona's own rules say.
 *
 * @param cases - the pages
 * @param evaluator - the persona's rules
 * @param refusals - the collector the API intercept pushes 401/403 statuses into
 */
const walkCases = (
    cases: readonly RoleSweepCase[],
    evaluator: Evaluator,
    refusals: number[]
): void => {
    for (const sweepCase of cases) {
        const resolved =
            typeof sweepCase.route === 'string'
                ? cy.wrap(sweepCase.route, { log: false })
                : sweepCase.route();
        resolved.then((path) => {
            if (evaluator.can(sweepCase.can)) expectAllowed(sweepCase, path, evaluator, refusals);
            else expectRefused(sweepCase, path);
        });
    }
};

/**
 * Declares one `it` per persona: sign in once, then walk every case.
 *
 * @param label - what this group of pages is, for the describe title
 * @param cases - the pages and what opens them
 * @param personas - who to sweep; every staff persona and the shopper by default
 */
export const sweepRoles = (
    label: string,
    cases: readonly RoleSweepCase[],
    personas: readonly E2ERole[] = SWEEP_PERSONAS
): void => {
    describe(`roles — ${label}`, () => {
        for (const persona of personas)
            it(`${persona} gets the pages its rules allow and none else`, () => {
                const refusals: number[] = [];
                cy.restore();
                cy.loginAsFast(persona);
                cy.env(['apiUrl']).then(({ apiUrl }) => {
                    // One intercept on the API origin: it only listens, every request continues.
                    cy.intercept(`${String(apiUrl)}/**`, (request) => {
                        request.on('response', (response) => {
                            if (response.statusCode === 401 || response.statusCode === 403)
                                refusals.push(response.statusCode);
                        });
                    });
                });
                evaluatorOf(persona).then((evaluator) => {
                    walkCases(cases, evaluator, refusals);
                });
            });
    });
};
