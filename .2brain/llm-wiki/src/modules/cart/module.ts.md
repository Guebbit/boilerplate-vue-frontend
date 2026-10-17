---
source: src/modules/cart/module.ts
sha256: 5dc9c7c851f655c81ef3ccbfb3c168d586c41dd87067756c4c96f66a4b2649a5
generated_at: 2026-10-17T00:36:31.823343+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/module.ts

## Purpose
The Cart module manifest. Declares the module's identity (`name`, `loadingKeys`, `icon`, `section`, `order`), wires its routes and locales into the app registry, and defines the navigation entry—including a live badge (count + formatted total) and the auth-driven seed/reset logic that makes the badge correct across sign-in, sign-out, and account-switch events. Also contributes the `AddToCartButton` slot to the products module's `product-actions` area.

## Key elements
- **Default export** — an `AppModule` object (`satisfies AppModule`) that the kernel registry consumes to mount the cart.
- **`routes`** — imported from `./routes` and passed through to the router.
- **`navigation[0].badge`** — returns `storeToRefs(cartStore).badgeQuantity`; sets up two watchers: one that calls `cartStore.seedAfterSignIn()` whenever a shopper-qualified session appears (keyed on `session.can('update','Cart')` + viewer id, `flush:'post'`), and one that calls `clearCheckoutDrafts()` on a genuine sign-out (`wasAuth && !auth`).
- **`navigation[0].detail`** — a `computed` that formats `badgeMoney` via `formatCurrency`, returning `undefined` when the cart is empty.
- **`slots['product-actions']`** — `defineAsyncComponent(() => import('./components/AddToCartButton.vue'))`, keeping the button out of the eager entry chunk.
- **`responseSchemas`** — lazy import of `./response-schemas`.
- **`locales`** — en/it JSON loaders registered through `dictionary`.

## Relationships
- **`src/modules/cart/routes.ts`** — imported and assigned directly to the manifest's `routes` field.
- **`src/modules/cart/store.ts`** — `useCartStore` is called inside both `badge()` and `detail()` to read `badgeQuantity` and `badgeMoney` reactively.
- **`src/modules/cart/composables/use-checkout-draft.ts`** — `clearCheckoutDrafts` is invoked from the sign-out watcher to discard any in-progress checkout state.
- **`src/modules/cart/tests/module-badge.spec.ts`** — exercises the badge count and detail formatting logic defined in this manifest.
- **`src/modules/cart/tests/module-badge-account-switch.spec.ts`** — covers the account-switch watch (seed-after-reset, `flush:'post'` ordering) and the sign-out draft-clearing path.

## Notes
- The badge watches `session.can('update', 'Cart')` in addition to `isAuth` because role abilities arrive asynchronously after session restore; watching auth alone would miss the first shopper.
- `flush: 'post'` on the seed watcher is deliberate: it guarantees the seed runs *after* the store's own per-person reset, so the new user's data isn't clobbered by the old user's.
- The sign-out draft-clear guard (`wasAuth && !auth`) exists to skip the brief signed-out state during a page reload that restores a session.
- Currency formatting lives in the manifest (`detail`), not the store—the store holds raw numbers; the shell renders text.
- The file's JSDoc describes the intended dependency-direction vocabulary (`customer-supplier`, `conformist`, `published-language`) between cart and delivery/payments/account/products modules.
