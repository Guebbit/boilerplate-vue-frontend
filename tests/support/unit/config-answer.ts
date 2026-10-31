/**
 * @module
 * The public config `GET /config` answers: session mode, OAuth providers and the human-check
 * config. A fixture that stays inside the contract's shape, with every part overridable.
 */

/** What a part of the answer may be replaced with. */
export interface ConfigParts {
    /** The session mode and lifetimes. */
    session?: Record<string, unknown>;
    /** The OAuth provider names. */
    oauthProviders?: string[];
    /** The human-challenge config. */
    antibot?: Record<string, unknown>;
}

/**
 * Builds a `GET /config` answer.
 *
 * @param parts - the pieces a case cares about; the rest are the defaults (`jwt`, no OAuth, no challenge)
 */
export const configAnswer = (parts: ConfigParts = {}) => ({
    session: parts.session ?? {
        mode: 'jwt',
        lifetimeSeconds: { short: 86_400, medium: 604_800, long: 2_592_000 }
    },
    oauthProviders: parts.oauthProviders ?? [],
    antibot: parts.antibot ?? {
        provider: 'none',
        parameters: {},
        rungs: { identityBudgets: true, emailPolicy: 'off' }
    }
});
