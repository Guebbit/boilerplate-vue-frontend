---
source: src/modules/products/tests/product-edit-stale-record.spec.ts
sha256: 89e80bfd023684c596d366e4d408a8c3e4c48c5726f58ef91e56706cc7d5cc2f
signature: 71e7dc13b0b83ba6e32707d78c80e13c3c84aaca8f674e6317a6aa896c3d2f71
generated_at: 2026-11-10T05:28:02.439294+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-stale-record.spec.ts

## Purpose

Verifies the `ProductEdit` view's UX when a save (PATCH) is answered with a 412 Precondition Failed — i.e., the product record changed on the server since the form loaded it. Asserts that the form displays an in-place *warning* (not an error), surfaces a "reload latest" action, re-fetches the admin record only when that action is pressed, and never auto-resends the stale edit.

## Key elements

- **`PRECONDITION_FAILED`** — the reject envelope the HTTP layer builds for a 412; constructed via the `aProblem(412, …)` helper.
- **`adminReads()`** — helper that counts how many times `orvalMutator` was called with `GET /products/p1`, used to assert that "reload latest" triggers exactly one additional read.
- **`mountRefused()`** — mounts `ProductEdit` with a fully mocked `orvalMutator`: resolves `GET /locales`, resolves `GET /products/p1` (via `echo`), and rejects any `PATCH` with `PRECONDITION_FAILED`. Returns the flushed wrapper.
- **`echo(body)`** — builds a minimal valid product admin record; shape is irrelevant to this spec, only that it satisfies the response contract for the post-reload read.
- **`LOCALES_RESPONSE`** — static fixture for `GET /locales` (single active `en` locale).
- **Three `it` blocks** — (1) warning text + `warning` class + reload button exist; (2) clicking reload triggers one more GET and clears both the button and the alert; (3) PATCH is sent exactly once (no silent retry).

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** — the component under test; this spec exercises its 412-handling branch.
- **`src/infrastructure/http/index.ts`** — this file imports `orvalMutator` from this module and replaces it with a mock at the module level so all API traffic is intercepted.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem`, the helper that shapes the 412 error envelope.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture`, used to validate/shape the mock responses through the project's Orval schema.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, called once at module load to register enabled modules with the kernel registry (feeds `collectModuleRoutes`).

## Notes

- The 412 is deliberately treated as a **warning** (`warning` CSS class), not an error — the request itself was well-formed; only the record is stale. Tests assert the class explicitly.
- The spec never asserts on the *content* of the reloaded record, only that the GET happened and the UI cleared. The `echo` helper is a minimal placeholder.
- The module doc comment states that mount sequencing mirrors `product-edit-no-withdrawal.spec.ts`; if that file's setup changes, this spec's `beforeEach` may need to follow.
- The `// eslint-disable-next-line` on the `Promise.reject(PRECONDITION_FAILED)` line is intentional: the rejection payload is a structured error *envelope* (the client's contract), not a native `Error`.
