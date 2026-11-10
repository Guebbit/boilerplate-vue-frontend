---
source: src/modules/cart/module.ts
sha256: 41b016eafcd69bfbdc8db1cecf2f13400b45767e5a923bf9d8fa6e7eb5c1fa3f
signature: 41b016eafcd69bfbdc8db1cecf2f13400b45767e5a923bf9d8fa6e7eb5c1fa3f
generated_at: 2026-11-10T03:59:12.849038+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/module.ts

## Purpose

Module manifest for the cart and checkout feature. It declares routes, navigation entry (with a live badge and currency detail), onboarding tours, response schemas, locale bundles, and a cross-module slot contribution so that the app registry (`AppModule`) can wire the cart into the shell without the cart importing the shell.

## Key elements

- **Default export** — an object `satisfies AppModule` with `name: 'cart'`, `loadingKeys: ['cart']`, and the sections below.
- **`navigation[0]`** — the cart entry in the account section. `pinned: true` keeps it as a standalone button (never inside a dropdown). Contains:
  - **`badge`** — factory returning `storeToRefs(cartStore).badgeQuantity`. Internally watches `session.viewer?.id` (not just `isAuth`) with `flush: 'post'` to seed the cart after sign-in or account switch, and watches `isAuth` to call `clearCheckoutDrafts()` only on a genuine sign-out (preserves drafts across reloads).
  - **`detail`** — a `computed` that formats `badgeMoney` via `formatCurrency`, following the active i18n locale.
- **`tours`** — five ordered steps of the `checkout` tour targeting `checkout-lines`, `checkout-summary`, `checkout-notes`, `checkout-total`, `checkout-place-order`.
- **`responseSchemas`** — lazy import of `./response-schemas` exposing `cartResponseSchemas`.
- **`locales`** — lazy `en` / `it` JSON bundles wrapped in `dictionary`.
- **`slots['product-actions']`** — `defineAsyncComponent(() => import('./components/AddToCartButton.vue'))` so the button stays out of the eager entry chunk while the products module owns the slot.

## Relationships

- **`./routes`** — imported and passed directly as the `routes` field.
- **`./store`** — `useCartStore` provides `badgeQuantity` and `badgeMoney` refs consumed by the badge and detail; also `seedAfterSignIn()` called on viewer change.
- **`./composables/use-checkout-draft`** — `clearCheckoutDrafts` invoked on confirmed sign-out inside the badge factory.
- **`src/modules/cart/tests/module-badge.spec.ts`** / **`module-badge-account-switch.spec.ts`** — exercise the badge seeding, account-switch, and sign-out-cleanup logic defined here.

## Notes

- The badge watches the *identity* of the viewer (`session.viewer?.id`), not merely `isAuth`, so an account switch without sign-out triggers a fresh seed. `flush: 'post'` guarantees the store's per-person reset has already run before `seedAfterSignIn` fires.
- `clearCheckoutDrafts` is guarded by `wasAuth && !auth` specifically to survive page reloads (which briefly appear as "signed out" before session restore).
- Currency formatting lives in the `detail` computed, not in the store — the store holds numbers; the shell chrome renders display text.
- The `AddToCartButton` slot contribution lets `products` render the button without importing the cart module, keeping the dependency direction one-way.
