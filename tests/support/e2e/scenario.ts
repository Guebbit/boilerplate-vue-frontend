/// <reference types="cypress" />

/**
 * What the running backend says it seeded: the logins, and one row id per guarantee name.
 *
 * The specs run against whichever backend the profile supplied, and an id is that backend's
 * private choice — `Id` is deliberately format-free in the shared contract, so a spec naming one
 * has adopted a constraint the contract refused to make. This is the answer: the backend
 * PUBLISHES a name per row it promises (`order.paid`, `product.rich`, …) and a spec asks for the
 * name. It is also the only way to reach an order at all, since the paired backend produces its
 * order book by driving real checkouts and mints those ids when the shop is built.
 *
 * Two sources, one shape:
 *
 * | profile | where it comes from                                                                 |
 * | ------- | ----------------------------------------------------------------------------------- |
 * | demo    | `GET /__test/scenario`, the demo control surface                                    |
 * | live    | the file `LIVE_RESET_COMMAND`'s `--describe-to` wrote — a live deployment mounts no  |
 * |         | `/__test/*` at all, so a checkout that never resets has no description and says so  |
 */

/** One seeded login. Passwords are the demo ones; a deployment overrides them in its own `.env`. */
export interface ScenarioAccount {
    email: string;
    password: string;
}

/** The whole answer — see this module's own docblock. */
export interface ScenarioDescription {
    /** Which scenario is loaded, as the backend named it. `null` when nothing described itself. */
    scenario: string | null;
    /** Every seeded login, keyed by role name. */
    accounts: Record<string, ScenarioAccount>;
    /** Guarantee name → row id. Empty for a scenario that promises nothing, like `blank`. */
    subjects: Record<string, string>;
}

/** Which seeded account a command means. Every backend that can pair with this repo seeds all four. */
export type E2ERole = 'owner' | 'user' | 'editor' | 'moderator';

/** What a profile with nothing to say about itself answers — see {@link seedAccount}'s throw. */
const NOTHING_DESCRIBED: ScenarioDescription = { scenario: null, accounts: {}, subjects: {} };

/**
 * The description for the spec file currently running.
 *
 * Loaded once in the `before` hook at the bottom and re-read by `cy.restore()`, rather than
 * fetched where it is used: `seedAccount()` is read SYNCHRONOUSLY by two dozen spec lines that
 * type an address into a login form, and Cypress has no synchronous way to ask anything. The same
 * arrangement `commands.ts` uses for `__E2E_API_URL`.
 */
let current: ScenarioDescription = NOTHING_DESCRIBED;

/** Ask whichever source this profile has. Only ever called through {@link loadScenario}. */
const fetchScenario = (): Cypress.Chainable<ScenarioDescription> =>
    cy.env(['liveProfile', 'apiUrl']).then(({ liveProfile, apiUrl }) =>
        liveProfile === true
            ? // Absent until a reset has written one, which is a state rather than a failure: a
              // live checkout with no `LIVE_RESET_COMMAND` never resets and never describes.
              cy
                  .task<ScenarioDescription | null>('readScenarioFile')
                  .then((described) => described ?? NOTHING_DESCRIBED)
            : cy
                  .request(`${String(apiUrl)}/__test/scenario`)
                  .then((response) => response.body as ScenarioDescription)
    );

/**
 * Re-read the description and keep it. Called by `cy.restore()` — a different scenario promises
 * different rows — and once per spec file by the hook below.
 */
export const loadScenario = (): Cypress.Chainable<ScenarioDescription> =>
    fetchScenario().then((description) => {
        current = description;
        return description;
    });

/**
 * One seeded account's credentials, as the running backend resolved them.
 *
 * Read from the backend rather than kept as a literal here: the passwords are overridable per
 * deployment (`NODE_SEED_*_PASSWORD`), and a copy in this repo is a copy that can disagree with
 * the login form it is typed into. Synchronous, which is why {@link current} is loaded ahead of
 * every spec rather than on demand.
 *
 * @param role - which seeded account
 * @throws {Error} when this profile has not described itself, naming what would fix it
 */
export const seedAccount = (role: E2ERole): ScenarioAccount => {
    const account = current.accounts[role];
    if (account) return account;

    const described =
        Object.keys(current.accounts).join(', ') ||
        '(nothing — under the live profile, set LIVE_RESET_COMMAND so a reset writes the description)';
    throw new Error(
        `seedAccount("${role}"): this backend describes no such account. It describes: ${described}`
    );
};

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        interface Chainable {
            /**
             * The id of the row the backend promises under `name`.
             *
             * Throws naming every name the backend DOES offer when it has none — a backend seeded
             * without that guarantee cannot cover the branch behind it, and that should fail
             * loudly rather than leave a spec quietly asserting nothing. A mistyped name fails
             * here at runtime rather than at `tsc`: the list is the backend's, not this repo's.
             *
             * A command rather than a plain function, unlike {@link seedAccount}: the subjects
             * change with `cy.restore('blank')` mid-spec, where the accounts do not. Named
             * `subjectId` rather than `subject`, which Cypress reserves for its own chain state.
             *
             * @param name - a guarantee name, e.g. `order.ownerPending` or `product.rich`
             */
            subjectId(name: string): Chainable<string>;
        }
    }
}

Cypress.Commands.add('subjectId', (name: string) => {
    const id = current.subjects[name];
    if (id === undefined)
        throw new Error(
            `cy.subjectId("${name}"): the "${String(current.scenario)}" scenario on this backend ` +
                `offers no such row. It offers: ${Object.keys(current.subjects).join(', ') || '(nothing)'}`
        );
    return cy.wrap(id, { log: false });
});

// Once per spec file, before anything reads it. `cy.restore()` re-reads it whenever a spec puts a
// different scenario in place.
before(() => {
    loadScenario();
});
