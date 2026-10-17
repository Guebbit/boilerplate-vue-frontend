---
source: src/modules/locales/domain/deactivate-then-delete.ts
sha256: 3d77399a2e4c7df88374dacf5e28496caade5ed29d8efd51e6a5b8f4d04160ee
generated_at: 2026-10-17T01:03:54.386125+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/domain/deactivate-then-delete.ts

## Purpose
Implements the "deactivate → delete" sequence required by the API for active locales, including a best-effort reactivation rollback if the delete step fails. Exists so the caller never has to hand-code the rollback logic or risk leaving a silently deactivated row behind.

## Key elements
- **`deactivateThenDelete(wasActive, deactivate, remove, reactivate)`** — The sole export. Accepts four callback parameters (no direct API imports). Resolves once `remove` succeeds; rejects with `remove`'s original error if it fails, after attempting `reactivate` (only when `wasActive` was true). A failed `reactivate` is swallowed so it never masks the delete error.

## Relationships
- **`src/modules/locales/tests/deactivate-then-delete.spec.ts`** — Unit-tests this module, exercising the success path, the delete-failure + restore path, and the `wasActive = false` short-circuit.
- **`src/modules/locales/views/LocalesList.vue`** — View-level consumer that passes its own API-bound `deactivate`, `remove`, and `reactivate` callbacks into `deactivateThenDelete` when the user deletes a locale row.

## Notes
- The function is deliberately **callback-injected** (dependency-inverted) rather than importing a locale API client, which keeps it framework-agnostic and trivially testable.
- `reactivate` failure is intentionally swallowed (`.catch(() => undefined)`); the caller still receives the *original* delete error. This is a deliberate design choice, not an oversight.
- When `wasActive` is `false`, both `deactivate` and `reactivate` are skipped entirely (resolved with `undefined`), so the function degrades to a plain `remove()` wrapper.
