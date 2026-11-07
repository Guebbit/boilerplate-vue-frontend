/**
 * @module
 * The public config `GET /config` answers: session mode, OAuth providers, the human-check
 * config and the support address, the operator and the Terms version. A fixture that stays inside the contract's shape, with every part overridable.
 */

/** What a part of the answer may be replaced with. */
export interface ConfigParts {
    /** The session mode and lifetimes. */
    session?: Record<string, unknown>;
    /** The OAuth provider names. */
    oauthProviders?: string[];
    /** The human-challenge config. */
    antibot?: Record<string, unknown>;
    /** The support address the contact page shows. */
    supportEmail?: string;
    /** Who runs the site; the Terms, Legal and Privacy pages and the footer print it. */
    operator?: Record<string, unknown>;
    /** Which text of the Terms is in force. */
    termsVersion?: string;
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
    },
    supportEmail: parts.supportEmail ?? 'support@example.com',
    operator: parts.operator ?? {
        legalName: 'Guebbit Demo Shop Srl',
        street: 'Via Roma 1',
        city: 'Milano',
        zip: '20100',
        country: 'IT',
        email: 'shop@example.com',
        phone: '+39 02 1234567'
    },
    termsVersion: parts.termsVersion ?? '1'
});
