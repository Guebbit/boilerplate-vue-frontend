# src/modules/products/views/ProductCreate.vue

## Purpose

Vue SFC that renders the "create product" form page. It builds a Zod validation schema (a picked + extended slice of the shared `productsSchema`), wires it into the toolkit's `useStructureFormValidation`, and on submit calls the products store's multipart-aware `createProduct` action, then redirects to the new product's detail route.

## Key elements

- **`ProductCreateForm` interface** – local form shape: `title`, `price`, `description`, `active`, `imageUpload`.
- **`createSchema`** – `productsSchema.pick({ title, price }).extend({ description, active, imageUpload })`; guarantees create and edit screens share the same `title`/`price` rules.
- **`submitForm()`** – validates via `handleSubmit`, tracks upload progress through `trackUpload`, calls `createProduct`, then fires a success toast and a fire-and-forget `router.push` to `ProductTarget`.
- **`trackUpload(file, send)`** – wrapper around `useToolkitUploadProgress.track` that enables progress only when an image file is present.
- **`formElement` getter** – lazily resolves the `<form>` element inside `FormCard` via a ref, so a failed submit can focus/scroll to invalid fields after the card has mounted.
- **`revalidateOn: locale`** – re-runs validation (and re-resolves thunked i18n messages) when the active locale changes.
- **Template** – `LayoutDefault` → `FormCard` with Vuetify `v-text-field`, `v-number-input`, `v-textarea`, `FormImageUpload`, and `v-switch`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – listed as a graph neighbor, but no direct import or call appears in this file. The interaction (if any) is transitive, likely through `useProductsStore` or the error/notification utilities.

## Notes

- **Empty-string seeding is intentional.** `title` starts as `''` (not `undefined`) so that a pristine field fails the `.min(1)` length rule—which carries the locale-aware thunked message—rather than zod's built-in English "expected string, received undefined" type error. `price` starts at `0` so it is already valid on the schema's `min(0)`.
- **`formElement` is a getter, not a value.** The `<form>` lives inside `FormCard`; reading it eagerly during setup would be `undefined`. The toolkit calls the getter at submit time.
- **Navigation after create is fire-and-forget.** `void router.push(...)` is used so a `NavigationFailure` (e.g. an aborted route) does not reject the already-completed create promise and trigger an error toast.
- **`description` is coerced to `undefined` when empty** (`form.value.description || undefined`) before hitting the API, keeping the payload clean.
- **Upload progress fraction.** `event.progress ?? 0` guards against chunked/compressed requests where `Content-Length` is unknown, preventing the progress bar from jumping.
