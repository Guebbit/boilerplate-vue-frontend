/**
 * Which siblings a module may reach at all, hand-maintained rather than declared per module —
 * a new cross-module coupling is a deliberate edit here, rather than a one-line import nobody
 * questions. See `docs/theory/strategic-ddd.md` §2.
 *
 * The WHY for each edge — what is reached, and what kind of relationship it is
 * (conformist/customer-supplier/published-language) — is prose in the docblock at the top of the
 * dependent module's `module.ts`, next to the imports it describes.
 *
 * Read by `eslint.config.ts` (a sibling FE module's own files) and by
 * `tests/cross-cutting/module-coupling.spec.ts` (a call to another BACKEND module's contract
 * operation, via `contracts/rest/operation-modules.ts`) — one list, two coupling shapes.
 *
 * A value here is a BACKEND module name, not necessarily an FE folder — `addresses` and
 * `audit-logs` own no FE module of their own: `account` folds address-book screens into its own
 * module, and `observability` reads audit-log data for the shop's own audit trail.
 *
 * `module-coupling.spec.ts` excludes a module calling ITS OWN backend counterpart from this
 * check, so `observability` needs no entry naming backend `observability` — only the domains it
 * reaches beyond its own name belong here.
 */
export const MODULE_EDGES: Record<string, string[]> = {
    account: ['users', 'addresses'],
    cart: ['delivery', 'payments', 'account', 'products'],
    inventory: ['products'],
    observability: ['account', 'audit-logs'],
    orders: ['cart', 'delivery', 'payments', 'invoicing'],
    products: ['cart', 'wishlist', 'locales'],
    wishlist: ['cart']
};
