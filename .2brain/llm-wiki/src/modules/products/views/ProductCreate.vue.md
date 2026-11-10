---
source: src/modules/products/views/ProductCreate.vue
sha256: 15c2b79060ba1af4239cf5b890fc09f3d8f6eb9b1a553cb832ae14e924a0d773
signature: 15c2b79060ba1af4239cf5b890fc09f3d8f6eb9b1a553cb832ae14e924a0d773
generated_at: 2026-11-10T05:33:58.949713+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductCreate.vue

## Purpose
The "create product" page. Renders a multi-locale tabbed form (one tab per active language, fallback locale first and always open), validates the input, and submits a `POST /products` body—including an optional image upload—through the products store. After success it runs any after-create steps registered by other modules, shows a toast, and navigates to the new product's detail route.

## Key elements
- **`ProductCreateForm` (interface)** – Shape of the form state. Mirrors the API write body (`ProductTranslationsWrite` for translations) so no intermediate conversion is needed before submission.
- **`createSchema`** – Zod schema built from `productsSchema.pick({ price, translations }).extend({ imageUpload })`. Used by `useTranslatedEntityForm` for client-side validation.
- **`submitForm`** – Entry point for the form's submit handler. Normalises the price to the shop currency's minor-unit decimal places, drops blank per-locale descriptions via `toCreateTranslations`, builds the request body with `toRequestBody`, sends it through the idempotency-keyed `createKeyed` wrapper, then runs after-create steps, marks the leave-guard as saved, toasts, and pushes to `ProductTarget`.
- **`createKeyed`** – Wraps `createProduct` with `sendKeyed` + `useIdempotencyKeys` so a network retry resends the same key (preventing duplicate products). The key's subject includes the image name and size because the server fingerprint does not see multipart fields.
- **`afterCreateContributions` / `registerAfterCreate`** – Slot (`product-create-extras`) that lets other modules (e.g. inventory) register a `step(productId)` callback executed after the product exists. A failing step does not roll back the create.
- **`useBlockingError` (`submitError`)** – Renders an `InlineErrorAlert` next to the submit button on API failure rather than a toast, blocking further navigation until resolved.
- **`useLeaveGuard`** – Warns on navigation when `isDirty`; `markSaved()` lifts the guard after a successful create.
- **`useAxiosUploadProgress` (`uploadProgress` / `trackUpload`)** – Tracks multipart upload progress for `FormImageUpload`.
- **`TranslationTabs`, `FormCard`, `FormImageUpload`** – UI organisms/molecules that host the tabs, the `<form>` element (accessed via `card.value?.formElement` for error-focus), and the image picker.

## Relationships
- **`src/modules/products/composables/use-translated-entity-form.ts`** – Supplies all form state (`form`, `formErrors`, `isDirty`, `isSubmitting`), tab management (`activeTab`, `handleAddLocale`, `handleRemoveLocale`, `tabErrorCounts`), and the `handleSubmit` pipeline that `submitForm` plugs into.
- **`src/modules/products/schemas.ts`** – Provides `productsSchema`; this file picks the `price` and `translations` fields to build its local `createSchema`.
- **`src/modules/products/store.ts`** – Source of `createProduct` (the actual API call), `translationLocales`, `translationFallbackLocale`, and `fetchTranslationLocales`.
- **`src/modules/products/translations-body.ts`** – `toCreateTranslations` converts the form's per-locale `translations` map into the shape the API expects (dropping empty descriptions).

## Notes
- The template renders **no form at all** until `fetchTranslationLocales` resolves *and* the fallback tab is seeded; an empty `translations` map is intentionally valid to the schema so a partial state never triggers a spurious error.
- `price` initialises to `'0'` (the contract minimum) so the field is valid on first paint rather than showing a pre-emptive error.
- `taxClass` is **omitted** (not sent as `null`) on create, because there is no prior value to clear; the edit form uses `null` for the same semantic.
- The after-create slot is a one-shot per-creation registry: steps are pushed into a local array and executed exactly once after the `createProduct` promise resolves.
- `loadShop()` is called both at module level (via the shop module's boot) and here as a retry safeguard, so `shopMinorUnits` is available for price formatting even if the initial boot read failed.
