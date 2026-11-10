---
source: src/modules/orders/tests/orders-list-view.spec.ts
sha256: b1ad5c004925a8057fab6c5c517c793a8b6e7187b1d930ee64e712e9ce97faa0
signature: 693f162ae4a4a1f099b90eba88cac9b2b2e73a189efc92c621ca876e53d87b16
generated_at: 2026-11-10T05:03:45.403281+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/orders-list-view.spec.ts

## Purpose

Vitest suite that verifies the **mount-level decisions** of the `OrdersList` page: which optional sub-components and row actions the page renders (or withholds) based on the viewer's abilities and the server-supplied `actions` flags. It deliberately stubs out child components and HTTP calls so that only the page's own rendering logic is exercised.

## Key elements

- **`mountList(scope)`** – Mounts `OrdersList` with `watchSearchOrders` replaced by a no-op stub; accepts `'mine'` or `'all'` to choose the account vs. staff scope. Used by most describe blocks.
- **`signInAsPaymentRecorder`** – Seeds the session store with the `create:Payment` tenant ability (the gate for the RF-reference lookup).
- **`signInAsOrderDeleter`** – Seeds the session store with the `delete:Order` tenant ability (the gate for Delete / Restore row actions).
- **`signInReadingOrders(pinnedToOwner)`** – Seeds either a wide `display:Order` rule or a narrow owner-pinned `read:Order` rule to exercise the filter-visibility branch.
- **`order(id, deletedAt?)`** – Wraps `anOrder` from the shared fixtures with the column fields the list renders.
- **`deleteFlags(remove, permanent, restorable)`** – Builds a full `actions` object (all other fields set to `false`) matching the server contract for the row-action tests.
- **`router`** – In-memory Vue Router built from `collectModuleRoutes(enabledModules)`; used for route-level assertions (e.g. navigation to `/en/orders/:id/edit`).
- **`vi.mock('@api')`** – Replaces `searchOrders` with a mock so the soft-deleted-row and permanent-delete suites can shape the paginated response directly.
- **`vi.mock('@guebbit/js-toolkit')`** – Stubs `downloadBlob` to prevent real HTTP during mount.
- **Describe blocks** – Four focused suites: RF-reference lookup visibility/navigation, soft-deleted row (Restore vs Delete), permanent-delete action placement, and customer-vs-staff filter visibility.

## Relationships

- **`src/modules/orders/views/OrdersList.vue`** – The component under test; mounted directly (not via the barrel) with a named `OrderReferenceSearch` stub.
- **`src/modules/orders/store.ts`** – `useOrdersStore` is spied on: `watchSearchOrders` is replaced per mount; `restoreOrder` is spied to assert the restore call.
- **`contracts/rest/index.ts`** (`@api`) – Source of `searchOrders` (mocked) and the `schemas` re-export used by `contractResponse` to build typed fixture payloads.
- **`tests/support/stub.ts`** – `asStub` wraps return values so Vitest can type-check mocked calls without leaking `as any`.
- **`tests/support/unit/fixtures.ts`** – `anOrder` provides a valid `Order` base object for the `order` factory.
- **`tests/support/unit/mounted-vm.ts`** – `emitOn` triggers a Vue emit on the stubbed `OrderReferenceSearch` to simulate the "found" event.
- **`tests/support/unit/orval-fixture-schema.ts`** – `contractResponse` validates the fixture shape against the Orval-generated `SearchOrdersResponse` schema before returning it.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers module side-effects (i18n, routes, stores) once at module scope before any test runs.

## Notes

- The suite does **not** test `OrderReferenceSearch` internals (field, jump, store read); those live in `payments/tests/order-reference-search.spec.ts`. The component is stubbed by name (`template: '<div />'`) to keep the suite off the real HTTP call.
- The RF-reference lookup is **never** shown on the customer (`'mine'`) scope, even to a capable operator; it appears only on the staff (`'all'`) scope with `create:Payment`.
- Row actions (Delete, Hard-Delete, Restore) are driven **exclusively** by the server's `actions` flags in the response payload—the page makes no independent status/payment-status inference.
- The e2e neighbor `ac7-delete-account-with-open-orders.cy.ts` is not imported here; it exercises the same domain at the browser level but shares no code with this unit suite.
