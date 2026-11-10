---
source: scripts/pairing/spec-identity.ts
sha256: db366e432ac53a99e8bf7dd435a773610bd89dc6fe32c66ed9ccabf26616d0a1
signature: 515f4640256bc5f24eeec3181068f481b8d85eb4fd6b551e72caa5c887213f69
generated_at: 2026-11-10T02:47:18.659110+00:00
model: ollama:qwen3.8:27b
---

# scripts/pairing/spec-identity.ts

## Purpose

Cross-repo contract check that verifies a fixed set of spec files are semantically identical between this frontend checkout and its paired backend. It exists because a one-line spec edit in either repo silently forks what both sides believe they share, and neither CI catches it—the forked spec is still a valid spec. The file encodes *which* files are subject to the check, *how* to fingerprint them (byte-level for non-YAML, parse-and-normalise for YAML), and *how* to compare and report drift.

## Key elements

- **`RepoRole`** / **`THIS_REPO`** / **`siblingRole()`** — Typed role (`'frontend'` | `'backend'`) and a helper to invert it. `THIS_REPO` is hard-coded to `'frontend'`; the backend's twin omits the `fingerprint` logic.
- **`SharedFile`** — Maps one shared file to its (possibly different) relative path in each repo.
- **`SHARED_FILES`** — The authoritative, `as const` list of shared files. Membership rule: the file must be *produced in the backend and copied here*. Convenience-identical files (favicons, `.prettierrc`, shared scripts) are deliberately excluded. `asyncapi.public.yaml` is the single entry whose name differs across repos (→ `asyncapi.yaml`).
- **`SpecComparisonStatus`** / **`SpecComparison`** — Per-file comparison result: `'match'`, `'drift'`, `'missing-here'`, or `'missing-there'`, plus optional fingerprints on both sides.
- **`hashFile()`** — SHA-256 of raw file bytes (used for non-YAML).
- **`normalise()`** *(private)* — Recursively sorts object keys, preserves array order, strips trailing newlines from strings. Mirrors the backend's `SharedContract::normalise()`.
- **`fingerprint()`** — Identity hash. For `.yaml`/`.yml`: parse → normalise → JSON-serialise → SHA-256 (so two backends that serialise differently still match). For everything else: raw byte hash.
- **`compareSharedFiles()`** — Walks `SHARED_FILES`, resolves paths for both sides, returns one `SpecComparison` per entry. Never throws on a missing file; reports it as a status instead.
- **`sharedFileProblems()`** — Filters comparisons down to non-`'match'` entries.
- **`describe()`** *(private)* — Formats a file label for messages: single path when both sides agree, `a ↔ b` when they differ.

## Relationships

- **`scripts/pairing/check-spec-identity.ts`** — The script/CI entry point that calls `compareSharedFiles` (and `sharedFileProblems`) to gate the build on cross-repo spec identity.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — Unit tests exercising `fingerprint`, `compareSharedFiles`, `sharedFileProblems`, and the `SHARED_FILES` list.

## Notes

- **YAML fingerprinting is semantic, not byte-level.** The two backends (Node/redocly vs. PHP/symfony-yaml) quote and reflow differently; a raw byte hash would flag a genuine sync as drift. Parse → normalise → serialise → hash is the workaround, and it is frontend-only because the backend doesn't pair with *either* twin.
- **`normalise` is an exact mirror of the backend's `SharedContract::normalise()`.** Diverging them would reintroduce false drift. Array order is *preserved* (semantically significant for `security`, `enum`, `parameters`); only map-key order is normalised.
- **`SHARED_FILES` is the single source of truth for what is compared.** Adding a file here is a one-line copy in the backend's twin list. Removing one is equally trivial. The list is intentionally narrow: a gate that fires on an icon or a linter config trains people to ignore it.
- **Every entry is an *output* of the backend.** This repo's copy is generated/copied, not hand-maintained. Editing the local copy is the canonical failure mode the check catches: the next regeneration reverts the edit, and the resulting diff looks like the backend broke something.
- **`fingerprint` is exported** so the test suite (and potentially the backend's equivalent) can verify that two semantically-equal YAML documents produce the same digest without re-implementing the logic.
