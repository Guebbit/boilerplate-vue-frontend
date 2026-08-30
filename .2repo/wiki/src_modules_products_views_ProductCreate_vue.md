# src/modules/products/views/ProductCreate.vue

## Purpose

Renders the "Create Product" page. It builds a product-creation form (title, price, description, active flag, optional image), validates it against a derived slice of the shared `productsSchema`, and submits through the products store's multipart-aware `createProduct`. On success it toasts and navigates to the new product's detail route.

## Key elements

- **`createSchema`** – Built once from `productsSchema.pick({ title, price }).extend({ description, active, imageUpload })`. Reuses the same title/price rules as the edit form so the two screens can't disagree.
- **`useAppForm<ProductCreateForm>(…)`** – Wraps the initial values, the schema, and a deferred `formElement` getter (read from `card.value?.formElement`) to provide `form`, `formErrors`, `isSubmitting`, and `handleSubmit`.
- **`trackUpload(…)` / `uploadProgress`** – From `useUploadProgress`; passed into `FormImageUpload` to display multipart upload progress and injected as options into `createProduct`.
- **`submitForm`** – Calls `handleSubmit`, tracks the upload, creates the product, shows a success toast, and fire-and-forget navigates to `ProductTarget`. Errors are surfaced via `notifyErrorMessages`.
- **`FormCard`** – Owns the `<form>` element, back-link, submit button, and loading state; exposed via template ref `card`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor but not directly imported or referenced in this file's visible code.

## Notes

- **Seed values are load-bearing.** `title` is seeded `''` and `price` `0` so that an untouched field hits the schema's `.min(1)` / `.min(0)` check (which carries a locale-aware thunked message) rather than zod's built-in English *"Invalid input: expected string, received undefined"*. Leaving them `undefined` would bypass the i18n messages entirely.
- **`formElement` is a getter, not a value.** The `<form>` lives inside `FormCard` and may not be mounted when `useAppForm` is called. The getter `() => card.value?.formElement` defers DOM access until a failed submit actually needs to scroll/focus.
- **Navigation is intentionally fire-and-forget.** `void router.push(…)` prevents a `NavigationFailure` (e.g. user already left the page) from propagating into the `.catch` and turning a completed create into an error toast.
- **Schema messages are thunks resolved at parse time in the active locale** (same pattern as `@/modules/users/schemas.ts`); the schema object itself is created once and is not reactive to locale changes after mount.
