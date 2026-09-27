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
 * A value here is a BACKEND module name, not necessarily an FE folder — `addresses`,
 * `observability`, `audit-logs` and `invoicing` own no FE module of their own: `account` folds
 * address-book screens into its own module, `admin` reads observability and audit-log data for
 * the operator dashboard, and `orders` reads invoicing for a customer's own invoice/credit-note
 * downloads.
 */
export const MODULE_EDGES: Record<string, string[]> = {
    account: ['users', 'addresses'],
    admin: ['account', 'observability', 'audit-logs'],
    cart: ['delivery', 'payments', 'account', 'products'],
    inventory: ['products'],
    orders: ['cart', 'delivery', 'payments', 'invoicing'],
    products: ['cart', 'wishlist', 'locales'],
    wishlist: ['cart']
};
