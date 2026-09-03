# scripts/spec-identity.ts

## Purpose

Cross-repo contract check that verifies a small set of spec files (OpenAPI, AsyncAPI) are byte-identical between this frontend checkout and whichever paired backend is deployed. It exists because a one-line edit in one repo silently forks what both sides believe they share, and neither CI suite catches it since a forked spec is still a valid spec. The file is mirrored verbatim in the backend; only `THIS_REPO` differs there.

## Key elements

- **`THIS_REPO`** — `const 'frontend'`; the one value that differs from the backend's copy of this file.
- **`SHARED_FILES`** — `readonly SharedFile[]`; the two entries that must stay in sync: `openapi.yaml` and `asyncapi.public.yaml` (backend) → `asyncapi.yaml` (frontend). Membership rule: only files *produced in the backend and copied here* qualify.
- **`siblingRole(role)`** — flips `'backend'` ↔ `'frontend'`.
- **`hashFile(filePath)`** — sha256 of raw file bytes.
- **`fingerprint(filePath)`** — identity digest. For `.yaml`/`.yml`: parse YAML → `normalise()` → hash JSON. For all other extensions: delegates to `hashFile`. This lets the two backend twins (Node/redocly vs. PHP/symfony) fingerprint identically despite different YAML serialisation.
- **`normalise(value)`** *(internal)* — recursively sorts object keys, leaves array order intact, strips trailing newlines from strings. Mirrors the backend's `SharedContract::normalise()`.
- **`compareSharedFiles(siblingRoot, here?, role?)`** — returns `SpecComparison[]` for every entry in `SHARED_FILES`. Never throws on a missing file; reports it as `'missing-here'` or `'missing-there'` so callers can distinguish "wrong path" from "file deleted".
- **`sharedFileProblems(comparisons)`** — filters to entries whose status is not `'match'`.
- **`formatSharedFileProblems(comparisons, siblingRoot)`** — renders a human-readable error message (fingerprint pair for drift, remediation commands for rebuild + resync). Returns `''` when nothing is wrong.
- **`SpecComparison`** / **`SpecComparisonStatus`** — result shape and the four statuses: `'match'`, `'drift'`, `'missing-here'`, `'missing-there'`.
- **`describe()`** *(internal)* — formats a file pair for messages; prints `file ↔ siblingFile` only when the names differ.

## Relationships

- **`scripts/check-spec-identity.ts`** — CLI entry point that imports and calls `compareSharedFiles` + `formatSharedFileProblems` to gate CI / pre-commit on the shared specs.
- **`tests/unit/scripts/spec-identity.spec.ts`** — unit tests covering `fingerprint`, `normalise`, `compareSharedFiles`, and `formatSharedFileProblems`.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — appears in the dependency graph (likely shares a transitive dependency or is exercised in the same test batch); no direct import is visible in this file.

## Notes

- **Membership is strict and intentional.** Files kept identical "for convenience" (`spectral.yaml`, shared utility scripts, favicons, `.prettierrc`, etc.) are deliberately excluded — a fork in those is a question no script can auto-resolve, and a gate that fails on an icon trains people to ignore it.
- **This repo's copy of every entry is an *output***, not a source. Editing the local copy is the failure mode this list catches: the next backend regeneration reverts it, and the diff looks like the backend broke something.
- **`fingerprint` is absent from the backend's copy** of this file (the doc comment notes it). The backend has no need to distinguish the two serialisers; this repo does, because it can pair with *either* twin via `BACKEND_PATH` in `.env`.
- **Array order is never sorted** in `normalise` — `security`, `enum`, and path `parameters` are order-sensitive. Only object (map) keys are sorted.
- **sha256 over md5** is a deliberate, low-cost choice: the digest is printed in failure messages that get pasted into issues and commit messages, and a deprecated digest there invites questions.
