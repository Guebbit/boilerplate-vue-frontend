---
source: src/modules/products/views/ProductEdit.vue
sha256: b51025db67646a95aa06d36406797b88f6f9b177148d255454cc8e5ed8cff7e7
generated_at: 2026-10-02T15:41:13.953689+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductEdit.vue

## Purpose

Admin edit form for a single product. Fetches the full multi-language admin record (`GET /products/{id}/admin`), renders one tab per existing locale plus scalar fields (price, stock, shipping, tax class, image), and submits a merge-semantics PATCH through the products store. Exists as a dedicated view so that route-level `id` changes can re-hydrate the form without a full remount.

## Key elements

- **`loadAdminProduct(productId)`** – Fetches the uncached admin record and populates the `adminProduct` ref; called on mount and whenever the route `id` changes.
- **`ProductEditForm` (interface)** – Local shape of the form state; `translations` is typed as `ProductTranslationsWrite` where `null` deletes a locale and an absent key leaves it untouched.
- **`editSchema`** – Picks `price` + `translations` from the shared `productsSchema` and extends with an optional `imageUpload` file field.
- **`useTranslatedEntityForm<ProductEditForm>(…)`** – Toolkit composable that manages the tab bar, per-locale validation, auto-hydrate from `stored()`, and `handleRemoveLocale` (fetched → `null`, session-only → dropped).
- **`useStaleRecord`** – Handles HTTP 412 (ETag mismatch): re-reads the admin record, refreshes the ETag, and surfaces a blocking warning via `useBlockingError`.
- **`submitForm()`** – Validates, builds the body with `toRequestBody('UpdateProductByIdBody', …)` + `toPatchTranslations`, tracks multipart upload progress, then calls `updateProduct` from the store.
- **`pricePrecision` / `priceStep`** – Currency-aware decimal places (e.g. 3 for KWD, 0 for JPY) driving the price input's step and validation.
- **`mayViewTranslations`** – Computed gate: checks both `router.hasRoute('EntityTranslations')` and `session.can('read', 'Translation')` before exposing the link.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** – No direct import or call is visible in this file. The only shared infrastructure is the session store (`useSessionStore`), which is used here purely for a `can('read', 'Translation')` permission check. Any coupling to the two-factor flow is indirect (session guard upstream of this route).

## Notes

- **Locale-removal semantics are asymmetric.** Removing a tab that was present in the fetched record serialises `null` for that locale (server-side delete). Removing a tab opened *during this session* that was never saved simply omits it. See `handleRemoveLocale` in the composable.
- **`translations` is the only merge-field.** All other scalar fields in the PATCH body are full-replace; `translations` is upsert/delete/leave-alone. This is why `toPatchTranslations` exists as a separate helper.
- **Fresh copies on hydrate.** `categories`, `tags`, and `translations` are spread/cloned when hydrating the form so that "Reset changes" (`resetForm`) can re-hydrate from the untouched `adminProduct` ref.
- **Price precision is currency-driven, not fixed.** A 2-decimal input would silently corrupt a KWD price; a 0-decimal input would let a JPY user type cents that the server rounds away. Always read `pricePrecision` / `priceStep` rather than hard-coding.
- **`taxClass: null` always sent.** A cleared tax class means "shop standard rate," so `null` is a meaningful value distinct from "field absent."
- **The `id` prop is optional (`id?: string`).** The component tolerates a missing id (e.g. during a route transition) by no-op-ing the submit and showing the route id as a placeholder title.
