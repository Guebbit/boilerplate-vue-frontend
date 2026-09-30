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
    orders: ['cart', 'delivery', 'payments', 'invoicing', 'returns'],
    products: ['locales'],
    wishlist: ['cart', 'products']
};

/**
 * Refuses a stale key, or a cycle, anywhere in a module coupling graph.
 *
 * `eslint.config.ts`'s per-module block only checks a module's OWN imports against its OWN list —
 * nothing walks the graph as a whole, so `cart: ['orders']` beside `orders: ['cart']` would pass
 * lint forever. A VALUE may legitimately name a backend module with no FE folder of its own (see
 * the module docblock above) — only a KEY, a reacher's own name, must be a real one, since a key
 * that survived the deletion of its module can no longer mean anything.
 *
 * @param edges - the coupling graph to check — `MODULE_EDGES` in production, a small fixture in
 *  tests.
 * @param existingModules - the FE module folder names actually on disk.
 * @throws {Error} naming the stale key, or the cycle, on the first one found.
 */
export const assertAcyclicModuleEdges = (
    edges: Record<string, string[]>,
    existingModules: readonly string[]
): void => {
    const known = new Set(existingModules);
    for (const key of Object.keys(edges))
        if (!known.has(key))
            throw new Error(
                `MODULE_EDGES names "${key}", which is not a module under src/modules.`
            );

    // Standard DFS cycle check: `done` is a node whose whole subtree is already known acyclic,
    // `stack` is the path from the sweep's root down to the node being visited right now — a
    // node reappearing on it IS the cycle, read off the stack rather than rediscovered later.
    const done = new Set<string>();

    const visit = (node: string, stack: string[]): void => {
        if (done.has(node)) return;
        if (stack.includes(node))
            throw new Error(`MODULE_EDGES has a cycle: ${[...stack, node].join(' -> ')}.`);

        for (const next of edges[node] ?? []) visit(next, [...stack, node]);
        done.add(node);
    };

    for (const key of Object.keys(edges)) visit(key, []);
};
