/// <reference types="cypress" />

import { expectDeclaredStatus, rejectEnvelope, type ErrorCode } from './envelope';
import { skipUnlessSessionMode } from './harness';
import type { E2ERole } from '../scenario-description';

/**
 * One runner for "this control, answered with a failure or an empty list" rows.
 *
 * ── Why a table, not journeys ────────────────────────────────────────────────────────────────
 * Each row is one control with no story arc, and a journey is one story per file. Rows sit next
 * to their module (`src/modules/<m>/tests/e2e/actions.cy.ts`) and run through this runner, the
 * way `sweepA11y` runs a module's routes: `demo:remove` takes the rows with the module.
 *
 * ── What it names ────────────────────────────────────────────────────────────────────────────
 * No domain. Callers pass their own rows; this owns the steps and the assertions.
 *
 * ── Why jwt only ─────────────────────────────────────────────────────────────────────────────
 * A stubbed answer never reaches the session layer, so the cookie leg would re-run identical code.
 *
 * Steps are in `docs/tools/live-e2e.md#the-action-table`.
 */

/** Which part of the screen the row exercises; decides what "still there" means after a failure. */
export type ActionKind = 'form' | 'dialog' | 'row' | 'read' | 'empty' | 'slow';

/** The request a row stubs. */
export interface ActionIntercept {
    /** The HTTP verb. */
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** A `cy.intercept` URL pattern, e.g. `**\/cart`. */
    url: string;
    /** The path as `openapi.yaml` spells it, e.g. `/orders/{id}/cancel`: the status is checked against it. */
    operation: string;
}

/** What `emptyBody` is checked against before it is served: a Zod schema fits. */
export interface BodySchema {
    /** Throws when the value is not what the contract's response looks like. */
    parse: (value: unknown) => unknown;
}

/** One control and the answer it is given. */
export interface ActionRow {
    /** What a failure reports. */
    name: string;
    /** Who is signed in: the narrowest role that owns the page. */
    persona: E2ERole;
    /** The path to visit, locale prefix included, or a function yielding one once the backend can be asked. */
    route: string | (() => Cypress.Chainable<string>);
    /** Puts the page in the state to act on: open a dialog, fill a form. Runs after the visit. */
    prepare?: () => void;
    /**
     * Presses the control. Runs again after the stub is removed, to prove a retry works. Required
     * for `form`, `dialog` and `row`; a `read`, `empty` or `slow` row has no control to press.
     */
    trigger?: () => void;
    /** The request that is stubbed. */
    intercept: ActionIntercept;
    /** What the row exercises. */
    kind: ActionKind;
    /** The status to answer; 500 by default. Must be declared by the contract for `intercept.operation`. */
    status?: number;
    /** The error code to answer; `INTERNAL_ERROR` by default. */
    code?: ErrorCode;
    /** The sentence the page should show. */
    message?: string;
    /** `data-test` selector of the alert the page binds the failure to; any `[role=alert]` by default. */
    alert?: string;
    /** `data-test` selector of the control the trigger presses, checked enabled again after the failure. */
    control?: string;
    /**
     * Why typed values are not compared after the failure, for a form whose controls rewrite their
     * own text on blur (an autocomplete clears its search box once a value is chosen). The value
     * itself is kept; only the raw `input` text differs. Say what does it.
     */
    valuesNotCompared?: string;
    /** For `dialog`: the selector that must still exist after the failure. */
    dialog?: string;
    /** For `row`: the selector of the row that must still be listed. */
    listed?: string;
    /** For `slow`: the `data-test` of the input the person types into once the record is in. */
    field?: string;
    /** For `slow`: what is typed into `field`. */
    typed?: string;
    /** For `slow`: how `field` reads after the language switch re-reads the record; `typed` when omitted. */
    keptAs?: string;
    /** For `empty`: the list read's body, served as a 200. */
    emptyBody?: unknown;
    /** For `empty`: the generated response schema `emptyBody` must satisfy. */
    emptySchema?: BodySchema;
    /** For `empty`: selectors of the empty copy, the rows that must be absent, the pager, and an optional CTA. */
    empty?: {
        copy: string;
        rows: string;
        pager?: string;
        cta?: { selector: string; path: string };
    };
}

/**
 * The matcher for a row's request: the API call only. A path like `/orders` is also the address
 * of the app's own page, which a bare URL pattern would stub into a JSON "page"; the API is
 * always called through XHR.
 *
 * @param intercept - the row's request
 */
const apiRequest = (intercept: ActionIntercept) => ({
    method: intercept.method,
    url: intercept.url,
    resourceType: 'xhr' as const
});

/** Fallback for the `alert` selector. */
const ANY_ALERT = '[role=alert]';

/** The activity indicator in the app shell; `read` rows wait for it to go. */
const ACTIVITY_INDICATOR = '[data-test=activity-indicator]';

/** How long a `read` row waits for the spinner to go: the page must not spin forever on a failure. */
const SPINNER_TIMEOUT_MS = 10_000;

/** The status a failure row answers when it names none. */
const DEFAULT_STATUS = 500;

/** The code a failure row answers when it names none. */
const DEFAULT_CODE: ErrorCode = 'INTERNAL_ERROR';

/**
 * Every typed value on the page right now, in document order.
 *
 * @returns a chain yielding the values of all inputs and textareas
 */
const typedValues = (): Cypress.Chainable<string[]> =>
    cy
        .document({ log: false })
        .then((document_) =>
            [...document_.querySelectorAll<HTMLInputElement>('input, textarea')].map(
                (element) => element.value
            )
        );

/**
 * Visits the row's route, whichever way it is spelled.
 *
 * @param row - the row
 */
const visitRoute = (row: ActionRow): void => {
    const resolved =
        typeof row.route === 'string' ? cy.wrap(row.route, { log: false }) : row.route();
    resolved.then((path) => {
        cy.visit(path);
    });
};

/**
 * Registers the stub that answers the row's request with its failure.
 *
 * @param row - the row
 * @param alias - the alias to wait on
 */
const stubFailure = (row: ActionRow, alias: string): void => {
    const response = rejectEnvelope(
        row.status ?? DEFAULT_STATUS,
        row.code ?? DEFAULT_CODE,
        row.message
    );
    cy.intercept(apiRequest(row.intercept), response).as(alias);
};

/**
 * Registers a pass-through that counts the requests it sees, newer than any stub before it.
 *
 * @param row - the row
 * @param counter - incremented once per request
 */
const passThrough = (row: ActionRow, counter: { count: number }): void => {
    cy.intercept(apiRequest(row.intercept), (request) => {
        counter.count += 1;
        request.continue();
    }).as('retry');
};

/**
 * Asserts the failure reached the person and cost them nothing: the alert shows the message, the
 * address is unchanged, typed values and the dialog or row survive, and the control works again.
 *
 * @param row - the row
 * @param before - the address and typed values before the trigger
 */
const expectFailureHandled = (row: ActionRow, before: { href: string; values: string[] }): void => {
    const alertSelector = row.alert ? `[data-test=${row.alert}]` : ANY_ALERT;
    cy.get(alertSelector)
        .should('be.visible')
        .and('contain.text', row.message ?? row.code ?? DEFAULT_CODE);
    cy.location('href').should('equal', before.href);
    if (row.valuesNotCompared === undefined) typedValues().should('deep.equal', before.values);
    if (row.dialog) cy.get(row.dialog).should('exist');
    if (row.listed) cy.get(row.listed).should('exist');
    if (row.control) cy.get(row.control).should('not.be.disabled');
};

/**
 * Removes the stub and triggers again: exactly one request, a 2xx, and the alert gone.
 *
 * @param row - the row
 */
const expectRetryWorks = (row: ActionRow): void => {
    const counter = { count: 0 };
    passThrough(row, counter);
    row.trigger?.();
    cy.wait('@retry').its('response.statusCode').should('be.within', 200, 299);
    cy.then(() => {
        expect(counter.count, 'requests sent by the retry').to.equal(1);
    });
    cy.get(row.alert ? `[data-test=${row.alert}]` : ANY_ALERT).should('not.exist');
};

/**
 * Runs a `form`, `dialog` or `row` failure: stub, trigger, assert, unstub, retry.
 *
 * @param row - the row
 */
const runActionFailure = (row: ActionRow): void => {
    visitRoute(row);
    row.prepare?.();
    stubFailure(row, 'failure');
    cy.location('href').then((href) =>
        typedValues().then((values) => {
            row.trigger?.();
            cy.wait('@failure');
            expectFailureHandled(row, { href, values });
        })
    );
    expectRetryWorks(row);
};

/**
 * Runs a `read` failure: the page's own load is the failing request. The alert shows, the
 * spinner does not hang, and a reload with the stub removed renders the page.
 *
 * @param row - the row
 */
const runReadFailure = (row: ActionRow): void => {
    stubFailure(row, 'failure');
    visitRoute(row);
    row.prepare?.();
    cy.wait('@failure');
    cy.get(row.alert ? `[data-test=${row.alert}]` : ANY_ALERT)
        .should('be.visible')
        .and('contain.text', row.message ?? row.code ?? DEFAULT_CODE);
    cy.get(ACTIVITY_INDICATOR, { timeout: SPINNER_TIMEOUT_MS }).should('not.exist');
    cy.intercept(apiRequest(row.intercept), (request) => {
        request.continue();
    });
    cy.reload();
    cy.get('h1').should('exist');
    cy.get(row.alert ? `[data-test=${row.alert}]` : ANY_ALERT).should('not.exist');
};

/**
 * Runs an `empty` row: the list read answers with a schema-checked empty page, and the screen
 * shows its empty copy, no rows, no pager, and a CTA that goes somewhere.
 *
 * @param row - the row
 */
const runEmpty = (row: ActionRow): void => {
    const { empty, emptyBody, emptySchema, intercept, name, prepare } = row;
    if (!empty) throw new Error(`action row "${name}": an empty row needs \`empty\` selectors`);
    emptySchema?.parse(emptyBody);
    cy.intercept(apiRequest(intercept), { statusCode: 200, body: emptyBody }).as('empty');
    visitRoute(row);
    prepare?.();
    cy.wait('@empty');
    cy.get(empty.copy).should('be.visible');
    cy.get(empty.rows).should('not.exist');
    if (empty.pager) cy.get(empty.pager).should('not.exist');
    if (empty.cta) {
        cy.get(empty.cta.selector).click();
        cy.location('pathname').should('equal', empty.cta.path);
    }
};

/** How long a `slow` row holds the page's own read back. */
const SLOW_READ_MS = 2000;

/**
 * Runs a `slow` row: the page's own record read is held back, so the form is visited before it has
 * its values. Typing is refused until the record is in, and once it is, a refetch (a language
 * switch re-reads the record) never replaces what was typed.
 *
 * @param row - the row
 */
const runSlowRead = (row: ActionRow): void => {
    const { field, intercept, keptAs, name } = row;
    const typed = row.typed ?? 'typed';
    if (!field) throw new Error(`action row "${name}": a slow row needs \`field\``);
    cy.intercept(apiRequest(intercept), (request) => {
        request.continue((response) => {
            response.setDelay(SLOW_READ_MS);
        });
    }).as('slowRead');
    visitRoute(row);
    cy.get(`[data-test=${field}] input`).should('be.disabled');
    cy.wait('@slowRead');
    cy.get(`[data-test=${field}] input`).should('not.be.disabled');
    cy.get(`[data-test=${field}] input`).clear();
    cy.get(`[data-test=${field}] input`).type(typed);
    cy.get('[data-test=language-switcher]').first().click();
    cy.get('[data-test=language-option-it]').click();
    cy.get('html').should('have.attr', 'lang', 'it');
    cy.get(`[data-test=${field}] input`).should('have.value', keptAs ?? typed);
};

/**
 * Checks the row's status is one the contract declares, then runs the branch its kind names.
 *
 * @param row - the row
 */
const runRow = (row: ActionRow): void => {
    if (row.kind === 'empty') {
        runEmpty(row);
        return;
    }
    if (row.kind === 'slow') {
        runSlowRead(row);
        return;
    }
    expectDeclaredStatus(
        row.intercept.method,
        row.intercept.operation,
        row.status ?? DEFAULT_STATUS
    );
    if (row.kind === 'read') runReadFailure(row);
    else runActionFailure(row);
};

/**
 * Declares one `it` per row: restore, sign in as the row's persona, run it.
 *
 * @param module - the owning module's name, for the describe title
 * @param rows - the rows
 */
export const actionTable = (module: string, rows: readonly ActionRow[]): void => {
    describe(`actions — ${module}`, () => {
        for (const row of rows)
            it(row.name, function () {
                skipUnlessSessionMode(this, 'jwt');
                cy.visit('/en');
                cy.restore();
                cy.loginAs(row.persona);
                runRow(row);
            });
    });
};
