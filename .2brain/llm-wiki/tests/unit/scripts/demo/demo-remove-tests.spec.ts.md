---
source: tests/unit/scripts/demo/demo-remove-tests.spec.ts
sha256: 3125b84d6df43fd0f0f9a967d028c338793699aa9449ea729fef6e24d1d1966d
signature: 15a3ce83c921e55935ff25b1e842e510c94f27f5ebac692c176f5a7b0e779791
generated_at: 2026-11-10T08:13:45.198685+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/demo-remove-tests.spec.ts

## Purpose

Vitest spec for `scripts/demo/demo-remove-tests.ts`. It verifies that the three exported helpers (`requiredModules`, `removeResidueSpecs`, `headerProblems`) correctly parse `// requires-module:` headers, delete (or leave) e2e spec files based on a removed-module list, and flag missing or invalid headers in journey specs — all exercised against a throwaway temp tree so the real checkout is untouched.

## Key elements

- **`write(relative, content)`** (local helper) — creates parent directories and writes a file under the scratch `root`, used to build each fixture scenario.
- **`beforeEach` / `afterEach`** — create a unique `os.tmpdir()` directory (`mkdtempSync`) and remove it (`rmSync`) so every test case starts from a clean tree.
- **`describe('requiredModules')`** — three cases covering: comma-list parsing with trimming, the `none` sentinel, and `undefined` when no header is present (distinguishing "forgotten" from "none").
- **`describe('removeResidueSpecs')`** — four cases covering: header-based deletion vs. retention, subfolder (journey) specs, import-based deletion (active vs. commented import), and the no-`e2e`-folder guard.
- **`describe('headerProblems')`** — four cases covering: missing header in a journey, valid `none`/named headers, unknown module name detection, and the rule that only `journeys/` subfolder requires a header.

## Relationships

- **`scripts/demo/demo-remove-tests.ts`** — the module under test; this spec imports `requiredModules`, `removeResidueSpecs`, and `headerProblems` from it and asserts on their return values and filesystem side-effects.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — sibling spec in the `tests/unit/scripts/` tree; no direct import or runtime interaction is visible in this file.

## Notes

- The spec deliberately uses a **temp-directory scratch tree** rather than the real repo, because the functions mutate the filesystem (delete files). This is why `existsSync` assertions appear alongside return-value checks.
- `requiredModules` returning `undefined` (no header) vs. `[]` (header says `none`) is an intentional contract the tests pin down; downstream logic keys off that distinction.
- The import-detection test writes one active import and one **commented-out** import (`// import …`) and expects only the active one to trigger deletion — a non-obvious edge the spec guards.
- `headerProblems` only enforces the header requirement under `journeys/`; specs directly in `specs/` are exempt, which is called out explicitly in the last test case.
