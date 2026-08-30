# scripts/spec-identity.ts

## Purpose

Cross-repo contract integrity checker. A small set of spec files must be byte-identical (or semantically identical for YAML) between this repo and whichever backend is paired via `BACKEND_PATH`. A silent fork still passes each side's CI, so this module fingerprints the shared files on both checkouts and reports drift, missing files, or renames. It is the single source of truth for *which* files are shared and *how* they are compared.

## Key elements

- **`SHARED_FILES`** – `readonly SharedFile[]` listing the three contract files (`openapi.yaml`, `asyncapi.public.yaml`→`asyncapi.yaml`, `analytics-events.frontend.ts`/`analytics-events.ts`). Every entry is produced in the backend and copied here; editing the local copy is the failure mode this list catches.
- **`THIS_REPO`** – hardcoded `'frontend'`; the one value that differs from the backend's mirror copy of this file.
- **`siblingRole(role)`** – flips `'backend'` ↔ `'frontend'`.
- **`fingerprint(filePath)`** – returns a SHA-256 identity digest. For `.yaml`/`.yml` it parses, normalises (sorts object keys, strips trailing newlines), re-serialises to JSON, then hashes—so two semantically identical documents from different dumpers (redocly vs `symfony/yaml`) produce the same fingerprint. For other extensions (`.ts`) it hashes raw bytes.
- **`hashFile(filePath)`** – plain SHA-256 of file bytes; used as the non-YAML path inside `fingerprint` and exported for direct use.
- **`normalise(value)`** – internal recursive helper: sorts object keys, recurses into arrays, trims trailing `\n` from strings.
- **`compareSharedFiles(siblingRoot, here?, role?)`** – main entry point. Returns one `SpecComparison` per shared file with status `'match' | 'drift' | 'missing-here' | 'missing-there'`. Resolves multi-candidate backend paths by probing with `existsSync`.
- **`sharedFileProblems(comparisons)`** – filters out `'match'` entries.
- **`formatSharedFileProblems(comparisons, siblingRoot)`** – renders a human-readable multi-line message; returns `''` when clean.
- **`SpecComparison` / `SpecComparisonStatus`** – the result shape consumed by the CLI and tests.

## Relationships

- **`scripts/check-spec-identity.ts`** – the CLI runner that calls `compareSharedFiles` and `formatSharedFileProblems`, then exits non-zero on drift.
- **`src/infrastructure/observability/analytics-events.ts`** – the frontend-side file listed in `SHARED_FILES`; its backend twin lives at one of two paths (Node vs PHP layout), resolved at comparison time.
- **`scripts/generate-asyncapi-types.ts`** – explicitly *excluded* from `SHARED_FILES` (documented in the membership-rule comment) because it is hand-maintained for convenience on both sides, not a one-directional contract artifact.
- **`tests/unit/scripts/spec-identity.spec.ts`** – unit tests exercising `fingerprint`, `normalise`, `compareSharedFiles`, and `formatSharedFileProblems`.

## Notes

- The analytics-events entry is the only one with a two-path backend candidate; `compareSharedFiles` tries each candidate in order and uses the first that exists. The frontend side is always a single path.
- `fingerprint` for YAML depends on the `yaml` package's `parse` and a deterministic `JSON.stringify` of the normalised structure. A change in key *order* in a sequence (e.g. `parameters`, `security`, `enum`) will produce a different fingerprint—this is intentional.
- `THIS_REPO` is the only constant that differs between this file and its backend mirror. All other logic is copied verbatim; a divergence in the *list* of shared files is itself a bug this module cannot detect (it only checks the files it already knows about).
- The file never throws on a missing sibling path; absence is reported as a `SpecComparison` with the appropriate status so the caller can distinguish "wrong checkout directory" (everything `missing-there`) from "file was deleted" (one entry).
