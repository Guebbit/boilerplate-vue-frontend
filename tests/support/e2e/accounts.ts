/**
 * The demo accounts every profile seeds, in one place.
 *
 * `cy.loginAs()` drives them through the UI and the `adminApi` task authenticates with them
 * server-side; a second copy of a password is the kind of thing that drifts silently. These
 * values MUST match the paired backend's `src/kernel/seed-accounts.ts` and both repos'
 * `NODE_SEED_ADMIN_PASSWORD`/`NODE_SEED_USER_PASSWORD`. A literal, not `cy.env()`, because
 * `E2E_ACCOUNTS[role]` is read synchronously in several places and Cypress's env access here is
 * async-only (`allowCypressEnv: false` in cypress.config.ts).
 */
export const E2E_ACCOUNTS = {
    user: { email: 'gino@pino.it', password: 'Demo-User1!' },
    admin: { email: 'root@root.it', password: 'Demo-Admin1!' }
} as const;

export type E2ERole = keyof typeof E2E_ACCOUNTS;
