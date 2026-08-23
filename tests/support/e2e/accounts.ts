/**
 * The demo accounts every profile seeds, in one place.
 *
 * `cy.loginAs()` drives them through the UI and the `adminApi` task authenticates with them
 * server-side; a second copy of a password is the kind of thing that drifts silently.
 */
export const E2E_ACCOUNTS = {
    user: { email: 'gino@pino.it', password: 'password' },
    admin: { email: 'root@root.it', password: 'rootroot' }
} as const;

export type E2ERole = keyof typeof E2E_ACCOUNTS;
