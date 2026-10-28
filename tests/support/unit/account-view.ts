/**
 * @module
 * The account view the server answers `GET /account` and a sign-in with: the record, the packed
 * rules its holder carries, and the idle clock. A fixture that is not packed is a fixture no
 * client could use — the session store unpacks it with CASL's own reader.
 */

/** The rules most specs hand a signed-in customer: browse products, read their own orders. */
export const CUSTOMER_RULES: unknown[] = [
    ['read', 'Product', { active: true, deletedAt: null }],
    ['read', 'Order', { userId: 'u1', deletedAt: null }]
];

/**
 * Wraps an account record in the view the server sends.
 *
 * @param user - the account record
 * @param tenant - the packed tenant rules the holder carries
 * @returns the record plus `abilities` and `activity`
 */
export const accountView = <T extends object>(user: T, tenant: unknown[] = CUSTOMER_RULES) => ({
    ...user,
    abilities: {
        platform: [],
        tenant,
        version: 36,
        grantableRoles: [],
        secondFactorRequired: false
    },
    activity: { lastActiveAt: '2026-01-01T00:00:00.000Z' }
});
