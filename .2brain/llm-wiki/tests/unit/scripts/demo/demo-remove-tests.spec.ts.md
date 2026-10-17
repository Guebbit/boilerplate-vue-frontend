---
source: tests/unit/scripts/demo/demo-remove-tests.spec.ts
sha256: 3125b84d6df43fd0f0f9a967d028c338793699aa9449ea729fef6e24d1d1966d
generated_at: 2026-10-17T02:41:34.346407+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/demo-remove-tests.spec.ts

## Purpose

Unit tests for the `demo-remove-tests` script that remove residue e2e spec files after a demo module is deleted. The tests run against a throwaway temp directory (not the real checkout) to verify which files a header check or an import reference causes to be deleted, and which are left alone.

## Key elements

- **`requiredModules` tests** — verifies the header parser: comma-separated list with trimming, the `"none"` sentinel meaning "no modules", and `undefined` when no header line is present (distinguishing "forgotten" from "explicitly none").
- **`removeResidueSpecs` tests** — verifies file deletion logic: deletes specs whose `// requires-module:` header names a removed module, deletes specs that import a removed module path (even without a header), handles subfolder specs (journeys), and returns `[]` when no `e2e` folder exists. Also confirms that specs referencing *other* modules are preserved.
- **`headerProblems` tests** — verifies the honesty check: flags journeys lacking a header, accepts `"none"` and valid module names, flags unknown module names, and does *not* require a header for non-journey specs.
- **`write` helper** — creates a file at a relative path under the scratch root, making parent directories as needed.
- **`beforeEach` / `afterEach`** — creates and tears down a fresh `os.tmpdir()`-based scratch tree per test case, ensuring no cross-test contamination.

## Relationships

- **`scripts/demo/demo-remove-tests.ts`** — the module under test; this spec imports `headerProblems`, `removeResidueSpecs`, and `requiredModules` from it and exercises each against a synthetic file tree.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — sibling test in the same unit-test area; shares the convention of testing script helpers in isolation against a scratch tree rather than the real repo layout.

## Notes

- The scratch root is created via `mkdtempSync` in `os.tmpdir()`, not in the project tree—so these tests never touch the real `tests/e2e` directory.
- `requiredModules` returns `undefined` (not `[]`) when no header line is present; callers must treat these two cases differently ("forgotten" vs. "explicitly none").
- The import-based deletion test includes a commented-out import (`// import …`) to confirm that commented imports are *not* matched.
- `headerProblems` only enforces the header requirement for files under `journeys/`, not for all specs.
