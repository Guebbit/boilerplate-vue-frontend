/**
 * @module
 * The demo manifest: every module this build ships for the DEMO pet-supply e-commerce
 * domain, not for every project this boilerplate is forked into — the frontend twin of the
 * backend's `module.yaml#group: shop` axis
 * (`docs/theory/strategic-ddd.md#4a-foundation-and-shop` in that repo). Kept as a plain list here
 * rather than a field on each module's own manifest object: the frontend has no per-module
 * manifest FILE to hang a YAML field off the way the backend does, and a field would still need a
 * reader somewhere — this list IS that reader's answer, already resolved.
 *
 * `tests/unit/demo-modules.spec.ts` holds this equal to `enabledModules` in both directions: a
 * name here that `src/modules.ts` does not mount, and a module the backend marks `group: shop`
 * that this list forgot, both fail the suite instead of drifting silently.
 *
 * ZERO IMPORTS, on purpose: `scripts/demo/demo-remove.ts` reads this through a plain `tsx` run,
 * outside the app/vitest bundler contexts that resolve `@/` and, transitively, every module's OWN
 * aliased imports — so this file cannot pull in `src/modules.ts` (or anything else) without
 * breaking the one caller that has to run standalone.
 */

/**
 * Every demo-only module's own registry name — mirrors the backend's `group: shop` set exactly,
 * `invoicing` aside: the backend issues PDFs from its own module, and this frontend reads that
 * output through the `orders` module's own download link rather than owning a module of its own.
 */
export const DEMO_MODULE_NAMES = [
    'cart',
    'delivery',
    'inventory',
    'orders',
    'payments',
    'products',
    'returns',
    'wishlist'
] as const;

/** One `DEMO_MODULE_NAMES` entry. */
export type DemoModuleName = (typeof DEMO_MODULE_NAMES)[number];
