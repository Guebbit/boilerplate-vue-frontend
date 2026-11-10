---
source: tests/unit/scripts/contracts/shared-rules.spec.ts
sha256: 3fcdcf5d0316bc87d6829c28517b6ea779822bb02cee7467f24dbe7709d77fec
signature: a8aa04bcc5b07fbaf35c8c6b9f0662890ebc679e3926d80a6f38ded9655ba442
generated_at: 2026-11-10T08:13:22.808773+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/contracts/shared-rules.spec.ts

## Purpose

Vitest suite that guards the shared-rules registry and the `buildBrowserStorage` merge function. It verifies that every committed YAML in `shared/rules/` still satisfies its schema, that the registry has the expected three entries, and that the merge between the backend cookie list and the frontend display order either succeeds or rejects each known disagreement mode. A final block runs the merge against the real repo inventory to catch drift before it ships.

## Key elements

- **`load` (helper)** — reads a repo file, parses YAML, and validates against a given schema; mirrors what `generate-shared-rules.ts` does at build time.
- **`describe('the registry')`** — asserts that every entry in `SHARED_RULES` parses cleanly, that exactly three named rules exist (`browser-storage`, `static-pages`, `tours`), and that each writes to a distinct output path.
- **`cookie()` / `stored()` (fixture factories)** — build minimal single-row objects shaped like the backend cookie list and frontend stored-item list, respectively, for isolation tests.
- **`describe('buildBrowserStorage')`** — covers the happy-path merge (order preserved, names resolved) and five refusal scenarios: unknown backend id, unknown frontend id, duplicate id in order, frontend id colliding with a backend cookie, and two rows sharing a stored name.
- **`describe('the real inventory')`** — loads `contracts/cookies.yaml` and `shared/rules/browser-storage.yaml` from the repo, confirms every backend cookie id appears in the frontend order, and asserts the merge completes without throwing.

## Relationships

- **`scripts/contracts/shared-rules/browser-storage.ts`** — source of `buildBrowserStorage`, the function under test in most of the suite.
- **`scripts/contracts/shared-rules/rules.ts`** — exports `SHARED_RULES` (the registry map), `browserStorageSchema`, `syncedCookiesSchema`, and the `LoadRules` type that shapes the `load` helper.

## Notes

- The "real inventory" block is file-system-dependent: it calls `readFileSync` on `contracts/cookies.yaml` and `shared/rules/browser-storage.yaml` relative to the repo root. Running this spec outside a full checkout (or with those files moved) will fail with a missing-file error rather than an assertion error.
- Adding or removing an entry from `SHARED_RULES` breaks the hard-coded name list in the registry test — intentional, to force a conscious update.
- The test's `load` helper is a thin re-implementation of the same logic in `generate-shared-rules.ts`; if the generator's parsing strategy changes, keep the two in sync.
