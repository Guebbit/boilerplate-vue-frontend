---
source: tests/cross-cutting/pinned-browser-image.spec.ts
sha256: 63723d8d439d782a0cea23bbaf8dfab9b4d24f7b0033706553286f17c6fb73a0
signature: f520d9b7deeddefb06212594cfcfdba2ead228cef4d9c8188e35eaaae5518cc8
generated_at: 2026-11-10T06:39:45.895633+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/pinned-browser-image.spec.ts

## Purpose

A Vitest spec that guards CI consistency: it reads every YAML workflow in `.github/workflows`, extracts the pinned `cypress/included` image reference from each, and asserts that all of them pin the **same** image by both semver tag and `sha256` digest. This prevents a situation where one workflow silently runs a different (or newer) Chrome than another, which would invalidate cross-nightly timing and pixel comparisons.

## Key elements

- **`WORKFLOWS`** – Resolves the absolute path to `.github/workflows` relative to the test file.
- **`pinnedImages(workflow: string): string[]`** – Regex helper that pulls every `image: cypress/included:<value>` token out of a single workflow's raw text.
- **`describe('the pinned browser image')`** – Suite that, once at module-load time, reads all `.yml` files in `WORKFLOWS` and flattens their pinned images into a single array. Contains three assertions:
  - *not vacuous* – at least 3 image references are found (the regex actually matched something).
  - *digest + tag* – every reference matches `:<semver>@sha256:<64-hex>`, enforcing content-addressed pinning.
  - *one and the same everywhere* – the set of all found references has cardinality 1.

## Relationships

No dependency-graph neighbors are recorded for this file. It has no imports beyond `vitest`, `node:fs`, and `node:path`, and no other module imports it. Its only runtime "dependency" is the presence of the `.github/workflows/` directory.

## Notes

- This is a **cross-cutting / meta** test: it validates CI infrastructure rather than application code. It lives under `tests/cross-cutting/` to reflect that.
- The "not vacuous" assertion is a guard against a silent regex regression (e.g., a workflow rename or a change in how the image is specified) making the other two tests pass on an empty array.
- The regex only matches `cypress/included` images; if a workflow switches to a different base image, this test will no longer see it and the "not vacuous" check may fail first.
- Because the image list is collected once at `describe`-setup time (module scope), the tests do not re-read the filesystem per case.
