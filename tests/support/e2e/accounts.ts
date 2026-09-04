/**
 * The demo accounts every profile seeds, in one place.
 *
 * `cy.loginAs()` drives them through the UI and the `adminApi` task authenticates with them
 * server-side. These values MUST match `NODE_SEED_ADMIN_PASSWORD`/`NODE_SEED_USER_PASSWORD` in
 * both repos' `.env` — named rather than pointing at one backend's seed file, since the paired
 * backend is interchangeable and each keeps its seeds somewhere different. A literal, not
 * `cy.env()`, because `E2E_ACCOUNTS[role]` is read synchronously in several places and Cypress's
 * env access here is async-only (`allowCypressEnv: false` in cypress.config.ts). Diverge from the
 * backend and `cy.loginAs()` simply cannot log in.
 */
export const E2E_ACCOUNTS = {
    user: { email: 'gino@pino.it', password: 'Demo-User1!' },
    admin: { email: 'root@root.it', password: 'Demo-Admin1!' }
} as const;

export type E2ERole = keyof typeof E2E_ACCOUNTS;
