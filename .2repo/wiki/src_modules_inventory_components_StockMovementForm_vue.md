# src/modules/inventory/components/StockMovementForm.vue

## Purpose

A single Vue component that handles both stock **receipts** (inbound deliveries) and stock **adjustments** (shrinkage/corrections). It is instantiated twice in the parent layout — once with `mode: 'receipt'` and once with `mode: 'adjust'` — so that a user mis-click cannot accidentally flip a positive delivery into a negative correction. Validation rules differ per mode and are enforced via a Zod schema before dispatching the store action.

## Key elements

- **`props.mode`** (`'receipt' | 'adjust'`) — determines which validation branch, default amount, and store action apply; drives all template labels, hints, and `data-test` attributes.
- **`isReceipt`** (computed) — shorthand boolean used throughout the component to branch UI and logic.
- **`schema`** (computed Zod object) — branches on `isReceipt`: receipt requires `amount ≥ 1`; adjustment requires `amount` to be a non-zero integer (signed). All error messages are i18n-resolved.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — owns field state (`form`), error exposure (`formErrors`, `showFormErrors`), and submit gating (`handleSubmit`). Re-validates on locale change via `revalidateOn`.
- **`submitForm`** — wraps the store call (`inventoryStore.receive` / `inventoryStore.adjust`), posts a success toast with the new available count, refreshes the products catalogue, and routes failures through `notifyErrorMessages`.
- **`productOptions`** (computed) — maps `productsStore.productsList` to `{ value, title }` pairs for the `<v-select>`.
- **`formElement`** (ref) — bound to the `<form>` so `useStructureFormValidation` can leverage native form validity and the shared `VUETIFY_INVALID_FIELD_SELECTOR`.

## Relationships

- **`src/infrastructure/utils/errors.ts`** (same directory as graph neighbor `logger.ts`) — provides `notifyErrorMessages` (surfaces server error copy verbatim, especially the 409 "fewer units than reserved" message) and the `VUETIFY_INVALID_FIELD_SELECTOR` constant used for field-level error targeting.
- **`src/modules/inventory/store.ts`** — source of `receive`, `adjust`, and the shared `loading` flag.
- **`src/modules/products`** (store) — provides the product list for the select and is re-fetched after every successful write so its local counter copy stays in sync.

## Notes

- The component is deliberately **stateless across instances**: each mount starts with a mode-specific default amount (`10` for receipt, `-1` for adjust). There is no shared "sign toggle" anywhere.
- On a successful submit the `note` field is cleared but `productId` and `amount` are not — the next entry inherits the last product and a mode-appropriate default.
- The 409 conflict (adjustment that would drop stock below already-promised units) is the only expected "interesting" failure; its server message is shown verbatim via `notifyErrorMessages` rather than being re-worded client-side.
- `revalidateOn: locale` means switching UI language re-runs the Zod schema so error messages update without a manual re-trigger.
