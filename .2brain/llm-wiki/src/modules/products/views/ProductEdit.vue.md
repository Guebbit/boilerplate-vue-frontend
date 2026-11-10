---
source: src/modules/products/views/ProductEdit.vue
sha256: 021cb91b698e9eed6e04cfa039957c279d09ad9b8cadbe83c15ffe810663a72d
signature: 021cb91b698e9eed6e04cfa039957c279d09ad9b8cadbe83c15ffe810663a72d
generated_at: 2026-11-10T05:34:31.014630+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductEdit.vue

## Purpose

Single-file Vue component that renders the admin "edit product" page. It fetches the full admin record (`GET /products/{id}`), hydrates a multi-locale tab form (one tab per language the row carries), lets the operator change price/stock/tax/image/translations, and submits a merge-aware PATCH through the products store. It also handles the 412 stale-record flow, unsaved-changes guard, image upload progress, and release/restock-date change confirmations.

## Key elements

- **`ProductEditForm`** – local interface describing every field the form binds (price, flags, dates, `taxClass`, `categories`, `tags`, `translations: ProductTranslationsWrite`, `imageUpload`).
- **`editSchema`** – Zod schema built from `productsSchema.pick({price, translations}).extend({imageUpload})`; passed to the form composable for validation.
- **`useTranslatedEntityForm<ProductEditForm>(…)`** – the central composable that owns form state, per-tab error counts, `handleSubmit`, `handleAddLocale`/`handleRemoveLocale`, and `resetForm`.
- **`activateAutoHydrate(…)`** – one-shot watcher that copies the fetched admin record into `form` (spreading `translations` and array fields so the source object stays pristine for "Reset changes").
- **`useStaleRecord(…)`** – intercepts 412 responses; `reloadLatest` re-fetches the admin record to refresh the form and `ETag`.
- **`useLeaveGuard(isDirty, …)`** – warns before navigating away with unsaved edits; `markSaved` clears it after a successful save.
- **`useReleaseDateConfirm(…)`** – prompts the operator with affected-buyer count before saving a later/cleared release date or restock date.
- **`useAxiosUploadProgress`** – exposes a `progress` ref and `trackUpload` callback consumed by `FormImageUpload`.
- **`useMissingRecord`** – routes 404/403 on the initial fetch to the app's Error page.
- **`watch(id, …, {immediate:true})`** – re-fetches and resets `activeTab` whenever the route param changes while the view stays mounted.
- **`mayViewTranslations`** – computed gate: `router.hasRoute('EntityTranslations') && session.can('read','Translation')`, controls the "view all translations" link.
- **`toPatchTranslations`** (from `translations-body.ts`) – converts the form's `translations` map into the PATCH body shape (object = upsert, `null` = delete, absent = unchanged).

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/products/composables/use-translated-entity-form.ts` | Provides `useTranslatedEntityForm`, the core form/tab state machine this view drives. |
| `src/modules/products/composables/use-release-date-confirm.ts` | Provides `useReleaseDateConfirm`; called before saving a changed release or restock date. |
| `src/modules/products/release-date.ts` | Exports `dayChange`, used to compute the day-delta for the release-date confirmation dialog. |
| `src/modules/products/schemas.ts` | Exports `productsSchema`; this file picks `price` and `translations` rules to build `editSchema`. |
| `src/modules/products/store.ts` | `useProductsStore` supplies `fetchProductForEdit`, `updateProduct`, `loadingProductForEdit`, `translationLocales`, `translationFallbackLocale`, and `fetchTranslationLocales`. |
| `src/modules/products/translations-body.ts` | Exports `toPatchTranslations`, called when assembling the submit body from the form's `translations` map. |
| `src/modules/products/tests/product-edit-locale-race.spec.ts` | Tests locale race-condition behavior on the edit form. |
| `src/modules/products/tests/product-edit-missing-record.spec.ts` | Tests the 404/403 path when the admin record is absent. |
| `src/modules/products/tests/product-edit-no-withdrawal.spec.ts` | Tests the `noWithdrawal` field on the edit form. |
| `src/modules/products/tests/product-edit-purchasable.spec.ts` | Tests the `purchasable` flag behavior. |
| `src/modules/products/tests/product-edit-release-date.spec.ts` | Tests release-date confirmation and submission. |
| `src/modules/products/tests/product-edit-stale-record.spec.ts` | Tests the 412 stale-record (ETag) flow. |
| `src/modules/products/tests/product-edit-tax-class.spec.ts` | Tests `taxClass` handling, including the `null` clear case. |
| `src/modules/products/tests/product-edit-translations-link.spec.ts` | Tests the `mayViewTranslations` link visibility logic. |

*`src/modules/account/views/TwoFactorChallenge.vue`* appears in the dependency graph but is not imported or referenced in the visible source of this file; no direct interaction is documented here.

## Notes

- **`translations` submit semantics** – an object upserts a locale, `null` deletes one that existed on the fetched record, and an absent key leaves it untouched. `handleRemoveLocale` in the composable decides which case applies.
- **Shallow-copy on hydrate** – `activateAutoHydrate` spreads `translations` into a fresh object and copies `categories`/`tags` arrays. This is deliberate so that `resetForm()` ("Reset changes") can re-hydrate from the still-untouched `adminProduct` ref.
- **`taxClass: null` always sent** – unlike `translations` (merge semantics), the store's PATCH replaces scalar fields; `null` is the explicit "clear back to shop default" value and is always included in the body.
- **Dual `<script>` blocks** – the plain `<script>` block exists solely to set `name: 'ProductEditPage'` for `<KeepAlive>` and devtools; `<script setup>` cannot declare a component name itself.
- **`fetchTranslationLocales` never rejects** – it falls back to shop languages; the floating-promise lint suppression is intentional.
- **`mayViewTranslations` guards against a missing route** – in builds where the paired backend's `locales` module is absent, `router.hasRoute('EntityTranslations')` returns `false` and the link is hidden rather than throwing.
