---
source: src/modules/products/tests/use-release-date-confirm.spec.ts
sha256: 1f7252a6f9cc8a120a97337fbd70b5fd3b32b7ba316b9ed6611dede3eec99456
signature: ae4864f6e28762344058aad1b519af9e548110d4694b1a0aac2d43d4330b4222
generated_at: 2026-11-10T05:32:39.835204+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/use-release-date-confirm.spec.ts

## Purpose

Vitest spec for the `confirmReleaseDateMove` function returned by the `useReleaseDateConfirm` composable. It verifies the guard logic around a product's release-date change: when the server is queried for buyer-impact, when the question is skipped, how the confirmation dialog is presented, and what happens if the API call fails.

## Key elements

- **`describe('confirmReleaseDateMove', …)`** – the single test block; four cases:
  - *Changed date (even earlier)* → server is called; on success (0 buyers) the save proceeds (`go === true`).
  - *Unchanged date* → server is **not** called; save proceeds immediately.
  - *Buyers would be emailed* (`notify: 3`) → `useDialogStore().confirm` is invoked; visitor can cancel (`go === false`).
  - *Preview API rejects* (e.g. offline) → error is swallowed; save proceeds.
- **`previewRelease`** – hoisted `vi.fn()` standing in for `@api`'s `previewReleaseDateImpact`; the single external call under test.
- **`HELD` / `EARLIER`** – fixture dates (`2027-03-15` / `2027-03-01`) representing the stored date vs. a changed input.
- **`beforeEach`** – resets Pinia, clears mocks, and stubs `useSessionStore().can` to `true` (permission path is assumed granted).
- **`vi.mock('vue-i18n', …)`** – makes `t(key)` return the key itself so assertions can reference i18n keys directly.

## Relationships

- **`src/modules/products/composables/use-release-date-confirm.ts`** – the module under test; the spec imports `useReleaseDateConfirm` and exercises its returned `confirmReleaseDateMove` function.

## Notes

- The "buyers would be emailed" test passes `''` (empty string) as the new date rather than `EARLIER`; this exercises the same "date changed" branch but is worth noting if the composable treats empty strings specially.
- `vi.hoisted` is used so the `previewRelease` reference is available inside the `vi.mock` factory (avoids the temporal-dead-zone issue with hoisted imports).
- The permission path (`can === false`) is **not** covered by these tests; that branch lives elsewhere or is assumed to be a simple guard.
- On API failure the composable fails-open (returns `true`), which is a deliberate resilience choice—tests encode that as expected behavior.
