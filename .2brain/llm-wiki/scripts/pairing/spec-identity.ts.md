---
source: scripts/pairing/spec-identity.ts
sha256: b3b6ba9c6893b432654eab8ad1855a48fe646d8fcbb19c505f808ba4217fff56
generated_at: 2026-10-02T11:41:08.330783+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/spec-identity.ts

## Purpose

Defines the cross-repo contract identity check: a canonical list of files that must be byte-identical between this frontend and its paired backend, plus the fingerprinting and comparison logic to detect a silent fork. A forked spec is still a valid spec, so neither CI catches it on its own — this module is the explicit gate.

## Key elements

- **`RepoRole` / `THIS_REPO` / `siblingRole`** — Typing for which side of the pair a checkout is; `THIS_REPO` is always `'frontend'`.
- **`SharedFile`** — Interface holding the *backend* and *frontend* path for one shared file (they can differ, e.g. `asyncapi.public.yaml` → `asyncapi.yaml`).
- **`SHARED_FILES`** — The `readonly` list of exactly three shared contracts (`openapi.yaml`, `asyncapi.yaml`, `contracts/authorization-keys.yaml`). Membership rule: produced in the backend, copied here. Convenience-identical files and repo-internal generated outputs are deliberately excluded.
- **`SpecComparisonStatus` / `SpecComparison`** — Result shape per file: `match`, `drift`, `missing-here`, `missing-there`, with optional fingerprints.
- **`hashFile`** — Raw SHA-256 hex of a file's bytes.
- **`normalise`** *(internal)* — Recursively sorts object keys, preserves array order, strips trailing newlines from strings. Mirrors the backend's `SharedContract::normalise()`.
- **`fingerprint`** — Identity hash for a path. For `.yaml`/`.yml`: parse → normalise → `JSON.stringify` → SHA-256. For everything else: raw `hashFile`. Exists because the two backends serialise YAML differently.
- **`compareSharedFiles(siblingRoot, here?, role?)`** — Main entry point. Returns a `SpecComparison` per shared file; never throws on a missing file (reports `missing-here`/`missing-there` instead).
- **`sharedFileProblems`** — Filters to entries whose status is not `'match'`.
- **`formatSharedFileProblems`** — Renders a human-readable multi-line message (file paths, fingerprints, remediation commands). Returns `''` when clean.

## Relationships

- **`scripts/pairing/check-spec-identity.ts`** — The CLI/script runner that calls `compareSharedFiles` and `formatSharedFileProblems` to gate a CI step or local check.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — Unit tests covering the fingerprinting normalisation, comparison statuses, and message formatting.

## Notes

- **Never edit a frontend-side copy of a shared file.** Every entry in `SHARED_FILES` is an *output* of the backend's bundling step. Editing it here will be silently reverted on the next `sync:frontend`, and the diff will look like the backend broke something.
- **`fingerprint` is the one piece the backend does not replicate.** This repo can pair with *either* backend (selected via `BACKEND_PATH` in `.env`), and the two backends do not serialise YAML identically (redocly vs. `symfony/yaml`). The parse-normalise-hash path is the only way to compare across both.
- **Array order is meaningful** (`security`, `enum`, path `parameters`); only *object* key order is normalised away. A blanket sort would produce false positives.
- **SHA-256, not MD5:** the hex digest appears in failure messages that get pasted into issues and commit messages; avoiding a deprecated-algorithm discussion on every occurrence.
- **Trailing newline vs. trailing space:** a trailing `\n` is stripped (it reflects the YAML chomping indicator `|` vs `|-`), a trailing space is not (it is content).
