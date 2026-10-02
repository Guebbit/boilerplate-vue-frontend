---
source: src/modules/products/views/ProductCreate.vue
sha256: 5e792f9585d747d1f8b591fceff874a0986af1cc8c819e2605e02c47cb6433ab
generated_at: 2026-10-02T15:40:42.273687+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductCreate.vue

## Purpose
The create-product page. It renders a multi-locale form (one tab per active locale, fallback locale always open), validates input against a subset of `productsSchema`, and submits a `POST /products` request through the products store's multipart-aware `createProduct` action. On success it toasts and navigates to the new product's detail route.

## Key elements

- **`ProductCreateForm` (interface)** — the local form shape. `translations` is typed as `ProductTranslationsWrite` directly, so no conversion layer exists between form state and the store payload.
- **`createSchema`** — built from `productsSchema.pick({ price, translations }).extend({ imageUpload: imageUploadSchema })`. Validation messages are thunks resolved in the active language at parse time.
- **`useTranslatedEntityForm<ProductCreateForm>(…)`** — shared composable (also used by the edit form) that provides form state, per-tab error counts, tab add/remove handlers, and the submit pipeline. Configured with `seedFallback: true` so the fallback locale's tab is created as soon as `fallbackLocale` resolves.
- **`submitForm`** — validates, strips `imageUpload` into a `toRequestBody('CreateProductBody', …)` call, converts translations via `toCreateTranslations`, then passes the file to `createProduct` with `trackUpload` for progress. On success: `addMessage` toast + `router.push` to `ProductTarget`. On 422: per-language errors land on the named tab via `handleSubmitFailure`.
- **`useBlockingError`** — local (not toast) error state for API-level failures on submit; rendered as `InlineErrorAlert` next to the submit button.
- **`pricePrecision` / `priceStep` (computed)** — derived from the shop currency's minor unit (`currencyDigits(shopCurrency.value)`) so the price field's step and decimal places match the deployment's currency (e.g. 0 decimals for JPY, 3 for KWD).
- **`useAxiosUploadProgress`** — exposes `uploadProgress` and `trackUpload` to `FormImageUpload` for real-time upload feedback during the multipart request.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** — listed as a graph neighbor (likely a shared route-guard or auth-interception layer), but no direct import or runtime reference to that component exists in this file.

## Notes

- The form is **not rendered** until `openTags.length > 0`, which depends on `GET /locales` resolving. A `<v-skeleton-loader>` is shown in the meantime. This is deliberate: submitting with an empty `translations` map would pass client-side validation (empty map is valid to `productsSchema`) and produce a 422 the user cannot act on.
- `taxClass` is intentionally **omitted** (not `null`) on create; `null` is the edit-side signal meaning "use the shop default." On create there is nothing to clear yet.
- `onHand` is **create-only**. After creation, all stock mutations go through `/inventory` signed transitions.
- The `formElement` getter passed to `useTranslatedEntityForm` reads `card.value?.formElement` lazily (at submit time) because the `<FormCard>` ref is not yet mounted when the composable is initialized. An ESLint disable is required because TypeScript-ESLint cannot resolve the SFC instance type through `InstanceType<typeof FormCard>`.
- `loadShopCurrency()` is called here (in addition to app boot) so a failed initial fetch gets a second chance before the user interacts with the price field.
