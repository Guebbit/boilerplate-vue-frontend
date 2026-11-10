---
source: release-please-config.json
sha256: 2ad415da63ebedfcd4eede36a5576e0c0bc9803af4649c12905cb3e75419cd4e
signature: c9a6b38c1811707f696a7791d3720b3e018af306eb32fbf061bcfe6b5293be7a
generated_at: 2026-11-10T02:18:32.374735+00:00
model: ollama:qwen3.8:27b
---

# release-please-config.json

## Purpose

Configuration file for [release-please](https://github.com/googleapis/release-please) that defines how automated releases are generated for this repository. It tells the release-please tool which release strategy to use and where to write the changelog.

## Key elements

- **`release-type: "node"`** — Instructs release-please to use Node.js/npm conventions (e.g., semver versioning).
- **`packages["."]`** — Declares a single package rooted at the repository root, as opposed to a monorepo with multiple sub-packages.
- **`changelog-path: "CHANGELOG.md"`** — Specifies where the auto-generated changelog is written after each release PR.

## Relationships

- **`github/workflows/release.yml`** — The GitHub Actions workflow that invokes the `googleapis/release-please-action`. That action reads this config file at runtime to determine release behavior. Without this file the workflow's release-please step would fail or fall back to defaults.

## Notes

- The `$schema` URL points to the live schema in the `googleapis/release-please` repo; editors can use it for autocomplete and validation, but it has no runtime effect on the release process.
- Because only the root package is declared, adding a new sub-package (monorepo scenario) requires a corresponding entry under `packages` in this file.
