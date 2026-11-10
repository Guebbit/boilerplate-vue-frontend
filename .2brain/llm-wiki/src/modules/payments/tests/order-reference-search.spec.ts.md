---
source: src/modules/payments/tests/order-reference-search.spec.ts
sha256: 315c344e1e7943ac3030adaf2508c0034bfbf112a49f37ab59929429281fdfec
signature: da836b446cc4803754cab31442fc568c1daabec28e0de3d9729f0a70b2b4763d
generated_at: 2026-11-10T05:14:34.291125+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/order-reference-search.spec.ts

## Purpose

Unit-test spec for the `OrderReferenceSearch` component. It mounts the real component (with Vuetify and i18n), spies on the payments store's `findOrderIdByReference`, and verifies the component's narrow contract: emit `found` with an order id on success, render an inline message on no-match or failure, and never navigate. Navigation to `OrderEdit` is the host's responsibility, proven separately in `orders-list-view.spec.ts`.

## Key elements

- **`mountSearch`** — local helper; mounts `OrderReferenceSearch` with `vuetify` and `i18n` plugins via `@vue/test-utils`.
- **`inlineMessage`** — local helper; `vi.waitFor` that resolves once `[data-test=order-reference-search-error]` exists in the DOM.
- **`beforeEach`** — resets Pinia with a fresh instance and loads the `'en'` locale.
- **Test: "emits the found order and clears the field"** — mocks `findOrderIdByReference` → `'order-1'`; asserts the store method was called with the raw input, `found` event payload is `[['order-1']]`, and the input value is reset to `''`.
- **Test: "stays put and says so inline when nothing matches"** — mocks the method → `undefined`; asserts no `found` emission, error element present with `text-warning` class.
- **Test: "clears the inline message once the operator starts typing again"** — triggers the no-match path, then types new text; asserts the error element is gone.
- **Test: "blocks inline, not with a toast, on a real failure"** — mocks the method to reject with `aProblem(500, …)`; asserts no `found` emission, error element present with `text-error` class.
- **Test: "disables the button while the field is blank"** — asserts the submit button has a `disabled` attribute on a fresh mount.

## Relationships

- **`src/modules/payments/components/OrderReferenceSearch.vue`** — the component under test; mounted directly and interacted with via its data-test attributes.
- **`src/modules/payments/store.ts`** — provides `usePaymentsStore`; the spec spies on `findOrderIdByReference` to control the lookup result without hitting a real API.
- **`tests/support/unit/fixtures.ts`** — supplies `aProblem`, used to build a realistic 500-status rejection payload for the server-error test.

## Notes

- The component is tested in isolation from any router or host view. The `payments` module deliberately declares no `dependsOn` on `orders`; navigation is out of scope here (see `orders-list-view.spec.ts`).
- The test pattern (spy on the store's own read method) mirrors `record-offline-payment-form.spec.ts`.
- Selectors use `data-test` attributes (`order-reference-search-input`, `-submit`, `-error`) rather than role or text queries.
- Error severity is signalled via Vuetify text classes: `text-warning` (no match) vs `text-error` (server failure) — both rendered inline, never as toasts.
