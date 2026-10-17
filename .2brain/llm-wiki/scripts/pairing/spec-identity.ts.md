---
source: scripts/pairing/spec-identity.ts
sha256: 6274f238db8f8f09d3398df6c3aec63befb4a0b42eafcdfaef3527efd1053a73
generated_at: 2026-10-17T00:03:47.439837+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/spec-identity.ts

## Purpose

Defines the cross-repo contract identity check: a canonical list of files that must remain identical between this frontend repo and whichever backend it is paired with, plus the comparison and reporting machinery to detect a silent fork. A one-line spec edit in one checkout produces a still-valid-but-divergent spec that neither CI suite flags; this file makes the drift visible.

## Key elements

- **`SHARED_FILES`** — `readonly SharedFile[]`; the authoritative list of files that must be byte-identical across both checkouts (openapi, asyncapi public subset, authorization-keys, TLS certs for the webhook sink). Every entry is *produced* in the backend and copied here.
- **`RepoRole` / `THIS_REPO` / `siblingRole()`** — small role-abstraction so the same code can run from either side of the pair.
- **`fingerprint(filePath)`** — identity hash. For `.yaml`/`.yml` it parses, normalises (sorted keys, preserved array order, trailing-newline stripped), then sha256s the JSON form. For everything else it falls through to a raw `sha256` byte hash. This is the one piece the backend twin does not need.
- **`normalise(value)`** *(internal)* — recursively sorts object keys, leaves arrays in place, trims trailing newlines from strings. Mirrors the backend's `SharedContract::normalise()`.
- **`hashFile(filePath)`** — raw sha256 of file bytes (used for non-YAML files).
- **`compareSharedFiles(siblingRoot, here?, role?)`** — walks `SHARED_FILES`, returns a `SpecComparison` per entry. Never throws on a missing file; absent files are reported as `missing-here` / `missing-there` status.
- **`sharedFileProblems(comparisons)`** — filters out `match` entries.
- **`formatSharedFileProblems(comparisons, siblingRoot)`** — renders a human-readable report (file pair, fingerprints, status); returns `''` when clean so callers can branch on truthiness.

## Relationships

- **`scripts/pairing/check-spec-identity.ts`** — the CLI/gate script that imports `compareSharedFiles` and `formatSharedFileProblems` to produce a pass/fail result for CI.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — unit tests exercising `fingerprint`, `normalise`, `compareSharedFiles`, and `formatSharedFileProblems`.

## Notes

- **YAML vs. raw-byte hashing:** The Node and PHP backend twins serialise YAML differently (quoting, line-wrapping). A raw byte hash would flag a true sync as drifted. Hence `fingerprint` parses YAML first. Non-YAML files are hashed raw.
- **Membership rule:** Only files *produced in the backend and copied here* qualify. Convenience-shared files (`spectral.yaml`, shared scripts), convention-identical files (favicons, `.prettierrc`), and regenerable artifacts (generated types, API client collections) are deliberately **excluded** — a fork in those either doesn't break silently or has no single-source-of-truth to answer "which side is right."
- **`asyncapi.public.yaml`** is the sole entry whose filename differs between repos (it lands as `asyncapi.yaml` here). All other entries share the same relative path on both sides.
- **`normalise` preserves array order** — `security`, `enum`, and path `parameters` are order-significant; sorting them would call two different documents identical.
- **sha256 over md5** is a deliberate choice: checksums printed in failure messages get pasted into issues and commit messages, and a deprecated digest invites questions every time.
