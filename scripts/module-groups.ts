/**
 * Which `foundation | shop` axis each frontend module sits on — the FE mirror of the paired
 * backend's own `module.yaml#group` field (see that repo's `docs/theory/strategic-ddd.md`, the
 * foundation/shop section). Hand-maintained the same way `MODULE_EDGES` is: a new module cannot
 * be added without someone picking a group, which `tests/cross-cutting/module-groups.spec.ts`
 * enforces.
 *
 * `foundation` ships with every deployment, whatever the next project turns this boilerplate
 * into. `shop` is the removable pet-supply demo domain — exactly `src/demo-modules.ts`'s
 * `DEMO_MODULE_NAMES` list, FE-D4's manifest for `npm run demo:remove`. `example` is the one
 * module that exists only to be copied; it mirrors the backend's `example` group and is not on
 * that list, so `demo:remove` leaves it.
 *
 * Read by `eslint.config.ts`'s `foundation-may-not-import-shop` rule and by the spec above. No
 * folder move follows from this — see `DECISIONS_0926_7_FRONTEND_LAYOUT.md`, "Folder split —
 * Answer": a label locks in a direction the imports already respect, nothing more.
 */

/** One module's place on the axis. */
export type ModuleGroup = 'foundation' | 'shop' | 'example';

/**
 * Every enabled module's group, by name. Deliberately explicit rather than derived from
 * `DEMO_MODULE_NAMES` — a module NOT on this list fails the spec instead of silently defaulting,
 * which is the whole point of asking a human to pick one.
 */
export const MODULE_GROUPS: Record<string, ModuleGroup> = {
    account: 'foundation',
    'api-keys': 'foundation',
    cart: 'shop',
    delivery: 'shop',
    example: 'example',
    feedback: 'foundation',
    inventory: 'shop',
    locales: 'foundation',
    observability: 'foundation',
    orders: 'shop',
    payments: 'shop',
    products: 'shop',
    returns: 'shop',
    users: 'foundation',
    webhooks: 'foundation',
    wishlist: 'shop'
};
