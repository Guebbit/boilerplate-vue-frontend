---
source: tests/unit/scripts/audit/design-manifest.spec.ts
sha256: 3d08c5f168ac4723774cf299ceddfa201e9ca8fae7ea0925711fce54fdd73942
signature: e0c4a8a11462e0a1bae1ba05aa5e3b42435c83657d89888a39dca2d010de6662
generated_at: 2026-11-10T08:12:20.059690+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/design-manifest.spec.ts

## Purpose
Vitest unit tests for `mergeManifests`, verifying that multiple design-capture manifest parts combine into a single manifest with the correct shots, header metadata, viewports, and chrome sources—and that invalid inputs are rejected.

## Key elements
- **`shotNamed(id)`** – helper that casts a bare `{ id }` object into a `DesignShot`, supplying only the field the merge logic inspects.
- **`part(shots, extra?)`** – helper that builds a full `DesignCaptureManifest` with sensible defaults (version 1, fixed `gitHead`, empty dirty list, etc.) and optional overrides via spread.
- **`describe('mergeManifests')`** – the sole test block, containing five cases:
  - Shots are concatenated in run order across parts.
  - Header fields (e.g. `gitHead`) come from the *first* part only.
  - `viewports` maps and `chromeSources` arrays are unioned (deduplicated, order-preserving).
  - Two parts sharing a shot `id` throw with a message matching `/share the id a/`.
  - Passing an empty array throws `RangeError`.

## Relationships
- **`scripts/audit/design-manual/scripts/manifest.ts`** – the unit under test. This spec imports the `DesignCaptureManifest` type, the `DesignShot` type, and the `mergeManifests` function from that module. No other imports or side effects.

## Notes
- The `part` helper spreads `extra` *after* the defaults, so any field passed in `extra` silently overrides the default—tests rely on this to vary a single field (e.g. `gitHead`) without constructing a full object.
- The duplicate-ID assertion uses a regex on the thrown message rather than checking a specific error class, coupling the test to the error's *wording*.
- Uses `Array.prototype.toSorted` (stable sort, non-mutating), so the runtime must be a Node ≥ 20 / ES2023 environment.
