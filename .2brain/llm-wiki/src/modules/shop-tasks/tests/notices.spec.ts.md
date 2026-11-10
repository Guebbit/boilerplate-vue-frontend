---
source: src/modules/shop-tasks/tests/notices.spec.ts
sha256: cd020bef66efcc556de345fbbefc516571ee8f5269d0d6fa57f73d0dd7e8737b
signature: 47e5683f3eb9394f4be70b9cac0db4389e23ded24dc76cb522a54958e05965f7
generated_at: 2026-11-10T05:43:49.381179+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/tests/notices.spec.ts

## Purpose

Vitest spec that verifies the shop's notification registry (`shopNotices`) end-to-end: every declared code resolves through the right dictionary entry with the correct facts, links to the expected route/params, and the locale-aware `productName` helper picks the right string. Uses a stub translator that prints `key|name=value…` so assertions check structure, not English prose.

## Key elements

- **`translate`** — Stub `NoticeContext['translate']`; renders `key|a=1|b=2` so each assertion pins the dictionary key *and* its named slots.
- **`context`** — A frozen `NoticeContext` (preferred `['en']`, `formatDate` appends `!`, `formatDay` appends `#`) that makes formatter invocation visible in output.
- **`Facts` / `full`** — Minimal `{code, params}` pair; `full` wraps it into a complete `Notification` row (id, audience, severity, createdAt) with a single `as Notification` cast.
- **`entryOf`** — Looks up a code in `shopNotices`; throws if absent, returning the registry entry.
- **`describeOf`** — Calls `entry.describe(full(facts), {…context, preferred})`; the primary assertion target.
- **`base` / `delayed` / `lost` / `held`** — Convenience builders that fill in the param shape for late-preorder, lost-parcel, and fulfillment-held notices respectively.
- **`name`** — Thin wrapper around `productName(titles, {preferred, translate})` used in the locale-resolution block.
- **`describe('productName', …)`** — Six cases covering preferred-language hit, fallback, empty-name skip, any-name fallback, and the `shop-tasks.unknown-product` sentinel.
- **`describe('the shop declares exactly its nineteen codes', …)`** — Asserts `Object.keys(shopNotices).length === 19` and the `shop-tasks.` prefix.
- **Buyer-notice blocks** — Cart-line-removed, wishlist-item-removed, stock-alert, cart-merge-refused (multi-line + bare fallback), fulfillment-delayed (dated/undated), fulfillment-held (notice + optional message), shipment-lost (reason, owed items, message).
- **Staff-notice block** — `purchase-hold-placed` (date formatting + `UserTarget`), `return-requested` (no-facts sentence + `ReturnTarget`).
- **Digest-summary block** — Ten `staff.*` codes asserted to report a count and open the relevant queue route.

## Relationships

- **`src/modules/shop-tasks/notices.ts`** — Source of `shopNotices`; this spec is the behavioural contract for every entry's `describe`, `target`, and key set.
- **`src/modules/shop-tasks/describe.ts`** — Source of `productName`; this spec pins its locale-selection and fallback semantics.
- **`@/kernel/registry`** — Provides the `NoticeContext` type that shapes the `context` object and every `describe` call signature.
- **`@types`** — Provides the `Notification` row type that `full` constructs.

## Notes

- The single `as Notification` cast in `full` is intentional: the spec author notes that the *contract's own types* at the registry entries are what validate the param shapes, not the test.
- `formatDate` appends `!` and `formatDay` appends `#` purely so an assertion can distinguish "the formatter was called" from "the raw value leaked through."
- The `translate` stub preserves insertion order of `named` entries, so assertions on multi-slot sentences depend on the registry author's key ordering.
- Route/param assertions use `toEqual` (deep) rather than `toBe` because `target` returns a fresh object each call.
