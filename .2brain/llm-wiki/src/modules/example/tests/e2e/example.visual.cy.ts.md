---
source: src/modules/example/tests/e2e/example.visual.cy.ts
sha256: 3dcf2806f199a5ab51640be78cc2ee4c6197804cff46f78272750c50bd4b8bae
signature: 3dcf2806f199a5ab51640be78cc2ee4c6197804cff46f78272750c50bd4b8bae
generated_at: 2026-11-10T04:24:31.255873+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/example.visual.cy.ts

## Purpose

Declares the visual-regression route list for the example module and hands it to the shared `sweepVisual` helper. It covers three views: the examples list, the editor detail page (seeded example), and the public published page (guest context).

## Key elements

- **`EDITOR_PUBLISHED`** – Seeded MongoDB ObjectId of the editor's published example, used to build the detail route.
- **`ADMIN_PUBLISHED`** – Seeded ObjectId of the admin's published example, read by the public page.
- **`sweepVisual('example', …, 'editor')`** – Registers the `list` and `detail` routes under the "editor" visual context.
- **`sweepVisual('example-public', …)`** – Registers the `published` route as a separate guest-facing sweep.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** – Provides the `sweepVisual` function that accepts a context name, an array of `[label, url, selector]` tuples, and an optional auth role; this file is a pure declarative consumer of that helper.

## Notes

- Not included in `npm run complete`. Run with `npm run test:e2e:visual`; re-record baselines with `npm run test:e2e:visual:update` **only after** visually inspecting the diff image.
- Baseline images are recorded inside the pinned Docker image (see `docs/tools/visual-regression.md`), not in the repo.
- The two hardcoded ObjectIds depend on the backend's demo-scenario seed; they will break if the seed data changes without updating them here.
