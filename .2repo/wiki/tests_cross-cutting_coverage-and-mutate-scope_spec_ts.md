# tests/cross-cutting/coverage-and-mutate-scope.spec.ts

## Purpose

Cross-cutting invariant test that enforces one directional rule between two config files: every file covered by a per-file coverage floor in `vitest.config.ts` must also fall within Stryker's mutation scope in `stryker.config.json`. The reverse is deliberately not asserted. Without this spec the relationship is maintained only by convention, and a floored-but-unmutated file would silently guard execution without ever verifying correctness.

## Key elements

- **`mutatedFiles()`** — Parses `stryker.config.json` as JSON, splits `mutate` into include/exclude globs (`!` prefix), and returns a `Set<string>` of resolved file paths via `globSync`.
- **`thresholdsBlock(source)`** — Locates the `thresholds: { … }` object literal in `vitest.config.ts` source text using a brace-depth scan; returns the substring or `''` if absent.
- **`flooredGlobs()`** — Reads `vitest.config.ts` as a string, extracts quoted glob keys (pattern: `'…': {`) from the thresholds block via regex.
- **`filesMatching(glob)`** — Expands a single glob with `globSync` and filters out directories, returning only file entries.
- **`describe('every file with a coverage floor is also mutated')`** — Three tests: (1) canary that both lists are non-empty, (2) canary that every floored glob resolves to ≥ 1 real file, (3) the real assertion that no floored file is missing from the mutated set.

## Relationships

- **`stryker.config.json`** — Read and parsed as JSON to obtain the `mutate` glob array (the "wider" set).
- **`vitest.config.ts`** — Read as raw source text (never imported) to extract the `coverage.thresholds` keys (the "narrower" floored set).
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — Peer test file in the suite; if any file it exercises carries a coverage floor, this spec guarantees those files are also within Stryker's mutation scope.

## Notes

- `vitest.config.ts` is **not** imported; it is read as text because importing it drags Vite/esbuild into the jsdom environment and crashes on a `TextEncoder`/`Uint8Array` check. The workaround (brace-matched scan) is acknowledged as fragile and is guarded by two canary tests that fail if the scan matches nothing.
- `process.cwd()` is used for all path resolution instead of `import.meta.url`, because Vite rewrites the module URL and it is no longer a `file:` URL.
- The glob keys are distinguished from non-glob properties (e.g. `perFile: true`) by requiring the quoted-string-then-object pattern (`'…': {`).
- The one-directional rule is load-bearing: adding a reverse assertion would turn every honest zero-coverage file into a failing gate, which contradicts the purpose of a floor.
