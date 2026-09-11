/**
 * The demo accounts every profile seeds, in one place.
 *
 * `cy.loginAs()` drives them through the UI and the `ownerApi` task authenticates with them
 * server-side. These values MUST match `NODE_SEED_ADMIN_PASSWORD`/`NODE_SEED_USER_PASSWORD` in
 * both repos' `.env` — named rather than pointing at one backend's seed file, since the paired
 * backend is interchangeable and each keeps its seeds somewhere different. A literal, not
 * `cy.env()`, because `E2E_ACCOUNTS[role]` is read synchronously in several places and Cypress's
 * env access here is async-only (`allowCypressEnv: false` in cypress.config.ts). Diverge from the
 * backend and `cy.loginAs()` simply cannot log in.
 */
export const E2E_ACCOUNTS = {
    user: { email: 'customer@example.com', password: 'Demo-User1!' },
    // `owner` of the demo shop AND `operator` of the installation — two memberships on one
    // account, which is what lets a single login reach both the shop's screens and the
    // observability dashboard. The env var stays `NODE_SEED_ADMIN_PASSWORD`: it is shared with
    // the paired backend and is not this file's to rename alone.
    owner: { email: 'root@root.it', password: 'Demo-Admin1!' }
} as const;

export type E2ERole = keyof typeof E2E_ACCOUNTS;
