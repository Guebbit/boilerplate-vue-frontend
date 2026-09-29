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
    products: ['cart', 'wishlist', 'locales'],
    wishlist: ['cart']
};

/**
 * One directed edge a cycle walk should not follow — `"cart->products"` — grandfathered past
 * {@link assertAcyclicModuleEdges} rather than silently swallowed by the check itself. See
 * `KNOWN_CYCLE_EDGES` below for the one production case and why.
 */
type EdgeKey = `${string}->${string}`;

/**
 * Real, pre-existing two-way couplings the cycle check must not fail the build over.
 *
 * `cart` reads a line's title/price straight off `products`'s backend contract, read-only
 * (`store.ts`'s `getProductById`); `products` reaches this module's own store to add an item from
 * the product page. Two different coupling shapes, each real and tested today, that happen to
 * close a loop in one shared graph — not the accidental case FA73 exists to catch. Skipping the
 * `cart->products` half of the loop here breaks the cycle for the walk while leaving both edges in
 * `MODULE_EDGES` itself, so the boundary lint and `module-coupling.spec.ts` keep checking both.
 *
 * A future edge landing on either side of this pair still throws — only this exact pair is
 * exempt. Resolving it for real (one module, or one side stops holding the other's state) removes
 * the entry; it does not get a second one next to it.
 */
export const KNOWN_CYCLE_EDGES: ReadonlySet<EdgeKey> = new Set(['cart->products']);

/**
 * Refuses a stale key, or an ungrandfathered cycle, anywhere in a module coupling graph.
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
 * @param knownCycleEdges - edges the walk below skips, for a real coupling already reviewed and
 *  accepted — {@link KNOWN_CYCLE_EDGES} in production, empty by default so a test fixture proves
 *  the walk itself rather than the exemption.
 * @throws {Error} naming the stale key, or the cycle, on the first one found.
 */
export const assertAcyclicModuleEdges = (
    edges: Record<string, string[]>,
    existingModules: readonly string[],
    knownCycleEdges: ReadonlySet<EdgeKey> = new Set()
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

        for (const next of edges[node] ?? []) {
            if (knownCycleEdges.has(`${node}->${next}`)) continue;
            visit(next, [...stack, node]);
        }
        done.add(node);
    };

    for (const key of Object.keys(edges)) visit(key, []);
};
