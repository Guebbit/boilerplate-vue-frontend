---
source: tests/cross-cutting/backend-pairing.spec.ts
sha256: 86d741009919361ede333200499a45d1e40965c681520e49f10577b130e6d354
generated_at: 2026-10-17T01:59:41.530670+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/backend-pairing.spec.ts

## Purpose

A Vitest spec that enforces cross-repository pairing between this repo's enabled modules and their counterparts in `boilerplate-node-backend`. It exists because nothing in a frontend build fails when the backend renames, splits, or adds a module — the two module maps drift silently until someone is lost. Living in a spec (not prose docs) means a broken pairing fails the test gate rather than just going stale on a wiki page.

## Key elements

- **`BACKEND_PAIRING`** – The canonical mapping: each enabled frontend module → `counterparts` (backend module names) and an optional `why` string required whenever the pairing is not a simple one-to-one name match.
- **`UNPAIRED_BACKEND_MODULES`** – Reverse-direction table: backend modules that have *no* frontend counterpart, each with a one-sentence reason. Guards against a backend domain that nobody on this side ever named.
- **`isSameName`** – Pure helper: `true` when a pairing is exactly one counterpart with the identical name (no `why` required).
- **`BACKEND_MODULES_FILE`** – Absolute path to the sibling backend's `src/modules.ts`, built from `resolveBackendPath()`.
- **`readBackendModuleNames`** – Reads that file, regex-extracts the `ModuleName` type-union, and returns the literal module-name strings. Returns `undefined` if the file is absent or the union is unparseable.
- **`backendModuleNames`** – Module-level cached call to the above; drives the `skipIf` conditions on the sibling-dependent tests.
- **`describe('the cross-repository pairing')`** – Seven tests:
  1. Every enabled module has a `BACKEND_PAIRING` entry.
  2. Non-one-to-one entries carry a `why`.
  3. No entry references a disabled/removed module.
  4. *Guard on the guard:* `enabledModules` is non-empty (prevents vacuous pass).
  5. *(skipIf no sibling)* Every named counterpart actually appears in the backend's `ModuleName` union.
  6. *(skipIf no sibling)* The sibling read returned a non-empty list.
  7. *(skipIf no sibling)* Every backend module is either covered by some entry's `counterparts` or listed in `UNPAIRED_BACKEND_MODULES`.

## Relationships

- **`scripts/pairing/paired-backend-path.ts`** – Provides `resolveBackendPath()`, which returns the filesystem path to the sibling backend checkout. This spec uses it to locate `src/modules.ts` for the cross-repo name verification. Without that function the spec cannot know where the backend lives.
- **`@/modules`** (via `enabledModules`) – The source of truth for which frontend modules are active. The spec validates `BACKEND_PAIRING` against this list in both directions.

## Notes

- **Sibling-absent ≠ failure.** `npm run test:unit` (the CI `test-unit` job) runs *without* checking out the backend. The three tests that need the sibling use `it.skipIf(backendModuleNames === undefined)` rather than failing, so the gate stays meaningful in both local-with-sibling and CI-without-sibling contexts.
- **Names are parsed, not imported.** The backend's `ModuleName` union is extracted by regex from `src/modules.ts` source. This is necessary because the backend's own path aliases (e.g. `@kernel/registry`) are unresolvable from this repo.
- **Deliberately stated, not derived.** The pairing table is hand-written. A name-matcher would incorrectly mark `observability` as unpaired (it maps to two backend domains) or miss `account`'s three-way relationship. The `why` field is the place that knowledge lives.
- **Guard-on-the-guard tests** (rules 4 and 6 in the describe block) exist to catch vacuous passes: an empty `enabledModules` array or an empty `UNPAIRED_BACKEND_MODULES` would otherwise satisfy every other check silently.
