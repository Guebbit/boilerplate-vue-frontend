---
source: src/modules/products/views/ProductEdit.vue
sha256: df0b091522fe72e12f1c2e28f178473c75b0c3d6c4d0273cf2a625d47cfe88c1
generated_at: 2026-10-17T01:36:05.920382+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductEdit.vue

## Purpose

Admin edit form for a single product. Fetches the multi-language admin record (`GET /products/{id}/admin`), renders one tab per locale the product holds, and submits a merged PATCH through the products store. Handles locale add/remove, currency-aware pricing, image upload, stale-record (412) recovery, and conditional field inclusion (release date, tax class).

## Key elements

- **`ProductEditPage`** (default export name) — stable component name for devtools / `<KeepAlive>` alongside `<script setup>`.
- **`ProductEditForm`** (interface) — the form shape: scalar fields, `taxClass?: TaxClass | null`, `categories`/`tags` arrays, `translations: ProductTranslationsWrite`, optional `imageUpload: File`.
- **`editSchema`** — `productsSchema.pick({ price, translations }).extend({ imageUpload })`; reuses the schema module's own validation rules rather than restating them.
- **`loadAdminProduct(productId)`** — sets `loadingAdmin`, calls `fetchProductAdmin`, stores the result in `adminProduct`.
- **`activateAutoHydrate(computed)`** — maps the fetched admin record into a fresh `ProductEditForm` (arrays and `translations` are copied so "Reset changes" can re-hydrate from the original).
- **`releaseDateChange(current)`** — returns `undefined` (field omitted from PATCH) when the value is unchanged; otherwise converts via `fromDateTimeLocal`. Prevents spurious buyer notifications from a round-tripped minute-precision string.
- **`pricePrecision` / `priceStep`** — derived from the product's (or shop's) currency digits; drives the price input's `step` and decimal display.
- **`mayViewTranslations`** — `router.hasRoute('EntityTranslations') && session.can('read', 'Translation')`; gates a link to the shared translations screen, tolerating builds where that module is absent.
- **`useTranslatedEntityForm<ProductEditForm>(…)`** — provides `form`, `handleSubmit`, `handleAddLocale`, `handleRemoveLocale`, `activeTab`, `tabErrorCounts`, etc. A locale tab removed from a fetched record serialises as `null`; one opened this session is simply dropped.
- **`useStaleRecord` / `useBlockingError`** — 412 responses mark the record stale and offer "reload latest" (re-fetch + re-hydrate); other submit failures render an inline `InlineErrorAlert` beside the submit button.
- **`useAxiosUploadProgress`** — feeds `FormImageUpload` with multipart progress while `updateProduct` is in flight.
- **`watch(() => id, …, { immediate: true })`** — reloads the admin record and resets `activeTab` when the route param changes without an unmount.

## Relationships

| Neighbor | Interaction |
|---|---|
| `store.ts` (`useProductsStore`) | Calls `fetchProductAdmin(id)` and `updateProduct` (multipart-aware, merging PATCH). |
| `schemas.ts` | Picks `price` and `translations` rules from `productsSchema` to build `editSchema`. |
| `composables/use-translated-entity-form.ts` | Supplies all form state, tab management, validation flow, and submit orchestration. |
| `composables/use-active-locales.ts` | Provides `locales`, `fallbackLocale`, and `fetchActiveLocales` for the tab bar. |
| `composables/translations-body.ts` | `toPatchTranslations` converts the form's `translations` object into the wire body. |
| `domain/index.ts` | Exports `fromDateTimeLocal` / `toDateTimeLocal` used by hydrate and submit. |
| `domain/release-date.ts` | Part of the domain barrel; supplies date-domain logic consumed via `domain/index.ts`. |
| `tests/product-edit-locale-race.spec.ts` | Verifies locale tab add/remove race handling. |
| `tests/product-edit-no-withdrawal.spec.ts` | Verifies the `noWithdrawal` toggle round-trip. |
| `tests/product-edit-purchasable.spec.ts` | Verifies the `purchasable` flag default and submission. |
| `tests/product-edit-release-date.spec.ts` | Verifies the "only send when changed" release-date logic. |
| `tests/product-edit-stale-record.spec.ts` | Verifies the 412 → reload → re-hydrate flow. |
| `tests/product-edit-tax-class.spec.ts` | Verifies `null` tax-class clearing and standard-rate fallback. |
| `tests/product-edit-translations-link.spec.ts` | Verifies the `mayViewTranslations` gate (route + ability). |

## Notes

- `GET /products/{id}/admin` is **deliberately uncached**; the view does a plain fetch rather than using a `useStructureCrudApi` slice.
- `categories` and `tags` are shallow-copied (`[…original]`) during hydration, and `translations` is spread into a new object, so "Reset changes" can re-hydrate without the form having mutated the fetched record.
- `taxClass` is **always sent** on submit (`null` clears to the shop's standard rate), whereas `translations` is the one field the PATCH **merges** rather than replaces.
- The price input's `step` and displayed decimals adapt to the product's currency (e.g. KWD → 3 dp, JPY → 0 dp) via `currencyDigits`; hard-coding 2 decimals would lose data or silently round server-side.
- A removed locale tab serialises as `null` **only** if that locale existed on the fetched record; a tab opened during the session and never saved is simply absent from the body.
- The stale-record "reload latest" action re-fetches the admin record, which both re-hydrates the form and refreshes the `ETag` the next save will send.
