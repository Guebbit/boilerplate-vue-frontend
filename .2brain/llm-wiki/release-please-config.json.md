---
source: release-please-config.json
sha256: 2ad415da63ebedfcd4eede36a5576e0c0bc9803af4649c12905cb3e75419cd4e
generated_at: 2026-10-02T11:27:12.486598+00:00
model: ollama:qwen3.8:27b
---

# release-please-config.json

## Purpose

Configuration file for [release-please](https://github.com/googleapis/release-please), the automated release tooling. It tells release-please how to derive version numbers, where to write the changelog, and how to treat this repository's package layout. It is consumed by the `release-please-action` in the CI workflow.

## Key elements

- **`$schema`** – Points to the release-please JSON schema for editor autocomplete/validation.
- **`release-type: "node"`** – Instructs release-please to use Node.js-style semver bumping (major/minor/patch based on conventional-commit keywords) and `CHANGELOG.md` / `package.json` update conventions.
- **`packages["."].changelog-path`** – Declares the single (root-level) package and pins its changelog to `CHANGELOG.md` (the default location, stated explicitly).

## Relationships

- **`github/workflows/release.yml`** – The workflow invokes `googleapis/release-please-action`, which reads this file to determine release behavior. Without this config the action would fall back to defaults; with it, the repo's explicit `release-type` and package layout take effect.

## Notes

- The repo is treated as a **single-package** project (no monorepo `packages` array). Adding more entries under `packages` would make release-please manage multi-package releases.
- Because `release-type` is `"node"`, the tooling expects conventional-commit messages (`feat:`, `fix:`, `BREAKING CHANGE:`) in merged PRs to drive version bumps—messages that don't match will not trigger a release.
- `changelog-path` is set to the default value; it only matters if you later rename or move the changelog file.
