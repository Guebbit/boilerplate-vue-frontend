---
source: src/modules/products/views/ProductCreate.vue
sha256: 7200ee46906830869cce9297918277dbad08d3ce4ca4b9fe1c6fdc0cf198fcbe
generated_at: 2026-10-17T01:35:43.725919+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductCreate.vue

## Purpose

The product-creation form page. It renders one language tab per active locale (the fallback locale's tab is seeded first and always open), collects a single form body plus a per-locale `translations` map, and submits a multipart `POST /products` through the products store. It is the entry point a user hits to add a new product to the catalog.

## Key elements

- **`ProductCreateForm`** (interface) — Shape of the in-memory form. `translations` is typed as `ProductTranslationsWrite` directly so no conversion layer sits between form state and the wire body.
- **`createSchema`** — Built from `productsSchema.pick({ price, translations }).extend({ imageUpload })`. Validation messages are thunks resolved in the active locale at parse time.
- **`useTranslatedEntityForm<ProductCreateForm>(…)`** — Shared composable that owns form state, per-tab error counts, add/remove-locale handlers, and the submit pipeline. `seedFallback: true` guarantees the fallback tab exists before the form is usable.
- **`registerAfterCreate(step)`** — Exposed to slot contributions (`useSlot('product-create-extras')`) so other modules (e.g. inventory) can register a post-create step keyed on the new product id.
- **`submitForm`** — Orchestrates: clear previous error → `handleSubmit` → convert `releaseDate` via `fromDateTimeLocal` → `toCreateTranslations` → `toRequestBody('CreateProductBody', …)` → `trackUpload` + `createProduct` → run `afterCreateSteps` → toast + navigate to `ProductTarget`.
- **`pricePrecision` / `priceStep`** — Derived from `shopCurrency` (loaded via `loadShop()`); drives the `step` and `decimal-places` attributes of the price input so JPY shops get 0 and KWD shops get 3.
- **`useBlockingError`** — In-place submit failure display (via `InlineErrorAlert`) rather than a toast, per the project's request-flow convention.
- **`useAxiosUploadProgress`** — Tracks multipart upload progress for the image field.

## Relationships

- **`use-translated-entity-form.ts`** — Provides all multi-locale form state, tab management, validation wiring, and the `handleSubmit` pipeline that `submitForm` delegates to.
- **`translations-body.ts`** — `toCreateTranslations` strips blank descriptions and normalises the per-locale map into the wire shape.
- **`use-active-locales.ts`** — Supplies `locales`, `fallbackLocale`, and `fetchActiveLocales()`; the form is not rendered (skeleton shown) until this resolves.
- **`domain/index.ts`** — Exports `fromDateTimeLocal` used to convert the `<input type="datetime-local">` string to the API's expected date format.
- **`domain/release-date.ts`** — Underlying parsing/formatting logic for the release-date field (re-exported through `domain/index.ts`).
- **`schemas.ts`** — `productsSchema` provides the shared `price` and `translations` validation rules reused here.
- **`store.ts`** — `createProduct` performs the actual API call (multipart-aware).
- **`tests/product-create-*.spec.ts`** — Five spec files covering currency precision, extras slot, locale fallback seeding, release-date conversion, and tax-class omission.

## Notes

- The form is gated behind `openTags.length === 0` → skeleton loader. Without this, an empty `translations` map passes `productsSchema` (by design for merging PATCHes) and the API returns a 422 the user cannot act on because the field is not yet visible.
- `taxClass` is **omitted** (not `null`) to mean "shop standard rate" on create; on edit the same meaning is `null`. The comment in the interface documents this asymmetry.
- `price` is initialised to `0` (the API's own minimum) so the field is valid on first paint rather than showing a phantom error.
- `imageUpload` is explicitly set to `undefined` before `toRequestBody` runs, then passed as a separate multipart part — the helper would otherwise serialise it as JSON.
- `formElement` is a getter (`() => card.value?.formElement`) to defer DOM access until the `FormCard` has finished mounting; a plain ref would be `undefined` at the first validation pass.
- The post-create `router.push` is fire-and-forget (`void …`) so a `NavigationFailure` cannot convert a successful create into an error toast.
- `afterCreateSteps` failures are self-contained (each step "settles its own failure"); the create itself is never rolled back.
