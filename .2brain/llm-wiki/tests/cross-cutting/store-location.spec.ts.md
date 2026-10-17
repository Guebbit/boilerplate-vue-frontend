---
source: tests/cross-cutting/store-location.spec.ts
sha256: 77e164a4bfe11ffa37129877ce6f7c933579526cdd0b3594cb0bb6292716dd9f
generated_at: 2026-10-17T02:02:58.146762+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/store-location.spec.ts

## Purpose

Enforces a file-layout convention for Pinia stores: every module must declare its stores in exactly one of two shapes — `store.ts` (single store) or `stores/*.ts` (multiple stores) — and never both. It scans `src/modules` for any file containing a `defineStore(` call and asserts the file sits in a permitted location, so that path-based tooling and readers have one unambiguous answer to "where is this store?"

## Key elements

- **`MODULES_ROOT`** — Resolved path to `src/modules`, computed relative to this file's location.
- **`sourceFiles(moduleRoot)`** — Recursively lists all `.ts` files under a module root, excluding anything in a `tests/` directory.
- **`moduleNames()`** — Returns the list of module directory names under `MODULES_ROOT`.
- **`storeFilesOf(name)`** — For a given module, returns the relative paths of files that contain the literal string `defineStore(`. Detection is by call-site content, not filename.
- **`isPermitted(relative)`** — Predicate that accepts a path only if it is `store.ts` (single segment) or `stores/<file>.ts` (exactly two segments, first being `stores`).
- **Test: "%s puts every defineStore in a permitted place"** — `it.each` over every module; asserts no store-containing file falls outside the two permitted shapes.
- **Test: "never lets a module use both shapes at once"** — Asserts no module simultaneously has `store.ts` and a `stores/` directory with store files.
- **Test: "finds the stores it is meant to be checking"** — Canary: asserts at least one module yields a non-empty `storeFilesOf` result, preventing the other tests from passing vacuously if the search silently matches nothing.

## Relationships

No external module dependencies beyond Node builtins (`node:fs`, `node:path`, `node:url`) and `vitest`. The test reads files under `src/modules` but does not import them; interaction is purely via the filesystem.

## Notes

- Detection is intentionally content-based (`defineStore(`) rather than filename-based, so a store declared in a misnamed file is still caught.
- The canary test uses a floor of `> 0` (not `>= module count`) so that deleting a single domain module does not also disable the structural checks.
- `readdirSync` is called with `recursive: true`; the filter on the `tests` segment in the relative path handles nested spec files.
- The convention discourages the plural `stores/` shape for a single store — the header comment notes that two stores in one bounded context often signals a need to split contexts.
