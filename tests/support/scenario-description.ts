/**
 * @module
 * What a running backend says it seeded: the logins and one row id per guarantee name.
 *
 * Cypress-free, so the Cypress support (`e2e/scenario.ts`, which loads it) and the Node
 * Lighthouse runner (`scripts/lighthouse/`, which reads `GET /__test/scenario`) share one shape.
 */

/** One seeded login. Passwords are the demo ones; a deployment overrides them in its own `.env`. */
export interface ScenarioAccount {
    email: string;
    password: string;
    /** Single-use backup codes, published only for the two-factor persona. */
    backupCodes?: string[];
    /**
     * The base32 secret of the authenticator app a staff account is armed with. A staff role grants
     * nothing without one, so the login asks a code on top of the password; absent for a shopper.
     */
    totpSecret?: string;
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

/**
 * Which seeded account a command means. Every backend that can pair with this repo seeds all
 * thirteen: the four roles, the personas — a customer in one particular state each — and the staff.
 *
 * | persona        | state                                                         |
 * | -------------- | ------------------------------------------------------------- |
 * | `unverified`   | signed up, never proved the address                           |
 * | `twoFactor`    | email 2FA armed, with known single-use `backupCodes`          |
 * | `pendingEmail` | asked to change address, has not confirmed                    |
 * | `banned`       | switched off — a login is refused                             |
 * | `secondShopper`| a plain verified customer with an address book — the second buyer |
 *
 * | staff       | holds                                                          |
 * | ----------- | -------------------------------------------------------------- |
 * | `manager`   | the shop `manager` role                                        |
 * | `warehouse` | the shop `warehouse` role                                      |
 * | `support`   | the shop `support` role                                        |
 * | `operator`  | the platform `operator` role only — no shop membership at all  |
 */
export type E2ERole =
    | 'admin'
    | 'user'
    | 'editor'
    | 'moderator'
    | 'unverified'
    | 'twoFactor'
    | 'pendingEmail'
    | 'banned'
    | 'secondShopper'
    | 'manager'
    | 'warehouse'
    | 'support'
    | 'operator';
