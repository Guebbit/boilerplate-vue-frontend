---
source: tests/unit/scripts/pairing/spec-identity.spec.ts
sha256: a81f9787758e8f70a6c48a04e481d648e49bf81f156a3d247d4456917652e36f
signature: 76cec61fa4e0467dc173ca2ad74b93a49342519fbd7084547135962fbde3cfa9
generated_at: 2026-11-10T08:22:53.571895+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/pairing/spec-identity.spec.ts

## Purpose

Vitest suite that exercises the cross-repo contract-check logic in `scripts/pairing/spec-identity.ts` against synthetic temp-directory fixtures. It verifies that `compareSharedFiles` correctly identifies matches, drifts, and missing files between a frontend and a backend copy of shared spec files, and that `fingerprint` normalises YAML so formatting-only differences (quoting, key order, block-scalar chomping) do not produce false drift reports. It deliberately does **not** require the sibling checkout to be present.

## Key elements

- **`makeRoot` / `root`** – helpers that create a temp directory tree from a path→content map; every root is registered and cleaned up in `afterAll`.
- **`sharedFiles(role, suffix?)`** – builds a fixture map keyed by the role-specific path for every entry in `SHARED_FILES`, with contents indexed by array position (not by filename) so both sides agree on content despite differing paths.
- **`sharedFilesWith` / `withoutFile`** – single-entry mutation helpers; they use computed keys to sidestep a naming-convention lint rule that rejects string-literal filenames like `'openapi.yaml'` as object keys.
- **`describe('SHARED_FILES')`** – asserts the list is complete (8 files, both `openapi.yaml` and `asyncapi.yaml` present), has no duplicates, excludes regenerated artifacts, includes at least one cross-path pair, and that `siblingRole(THIS_REPO)` resolves to `'backend'`.
- **`describe('compareSharedFiles')`** – covers: identical copies all match; cross-path pair matches across different filenames; one-sided edit reports `drift`; empty sibling reports `missing-there` (never throws); deleted local file reports `missing-here`; both-empty does not throw.
- **`describe('fingerprint')`** – verifies that for non-YAML files `fingerprint` equals `hashFile`; for YAML it is invariant under quoting differences, map key reordering, and `|` vs `|-` chomping; that genuinely different content still differs; and that list order is preserved (not sorted like maps).

## Relationships

- **`scripts/pairing/spec-identity.ts`** – the module under test. This spec imports `SHARED_FILES`, `THIS_REPO`, `siblingRole`, `compareSharedFiles`, `formatSharedFileProblems`, `hashFile`, `fingerprint`, `sharedFileProblems`, and the `RepoRole` type from it.

## Notes

- Fixtures are driven from `SHARED_FILES` rather than a hardcoded path list, so any file added to the contract is automatically covered by every test case without editing this file.
- Contents in fixtures are keyed by **index**, not by filename, because the two repos use different paths for the same logical file (e.g. seed identities live at different locations). Keying by path would make every pair appear forked.
- The live assertion that the two repos actually agree in production is a dedicated CI job (`spec-identity`), not this suite. This suite only proves the comparison logic and the YAML fingerprint are correct.
- `OPENAPI` and `ASYNCAPI` are declared as constants (rather than inline literals) to avoid tripping the project's naming-convention lint rule on string-literal object keys.
- The YAML-fingerprint section is frontend-only: the backend never compares two differently-serialised YAML dumps, so its mirror of this suite omits that block.
