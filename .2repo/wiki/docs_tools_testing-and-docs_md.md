# docs/tools/testing-and-docs.md

## Purpose

Serves as the single map page for all testing layers and test-data sources across the two-repo project. It exists so a reader (human or AI) can orient themselves to the full testing strategy, find the right detail page, and understand why each layer is distinct before diving into any individual tool.

## Key elements

- **Mermaid flowchart** — visual dependency/ordering of the six testing layers (Unit → Demo E2E → Live E2E / A11y / Visual, with Mutation as a meta-checker).
- **Testing layers table** — nine rows (Unit, Component, Property, Cross-cutting, Accessibility, Visual Regression, E2E Demo, E2E Live, Mutation), each with the question it answers, tooling, npm command, and link to a detail page.
- **Rationale bullets** — explains why no layer subsumes another (isolation vs. wiring, filesystem cross-cutting, deterministic seeds vs. live infra, meta-testing).
- **"Reading a run" section** — documents `npm run test:report` / `npm run test:unit:report`, the JSON artefact, `scripts/report-test-results.ts`, and the `check:spec-identity` guard that keeps the script byte-identical across both repos.
- **E2E shard log convention** — `reports/e2e/shard-<n>.log` preserves full Cypress output because stderr may be truncated or piped away.
- **Test-data sources table** — four sources (`db/demo/demo-data.json`, per-module `demo.ts`, per-module `factory.ts`, `tests/support/contract-data.ts`) with their distinct purposes.
- **Data-flow Mermaid diagram** — illustrates how the backend produces and publishes the demo dataset (truncated in source).

## Relationships

- **docs/tools/component-testing.md**, **property-testing.md**, **accessibility-testing.md**, **mutation-testing.md**, **live-e2e.md**, **demo-profile.md** — each is a detail page linked from the layers table; this page is their parent/navigation anchor.
- **docs/tools/index.md** — index page that lists this page among the tools docs.
- **docs/tools/testing-quickstart.md** — quickstart entry point that likely links back here for the full strategy.
- **docs/tools/package-scripts.md** — documents the npm scripts (`test:unit`, `test:e2e`, `test:e2e:live`, `test:mutation`, `test:report`) referenced in this page's table.
- **docs/tools/package-dependencies.md** — lists the testing dependencies (Vitest, Cypress, Stryker, cypress-axe, pixelmatch, fast-check) used by the layers described here.
- **docs/reference/scripts.md** — reference for `scripts/report-test-results.ts` and `check:spec-identity`, both named in the "Reading a run" section.
- **docs/getting-started.md** — onboarding doc that likely points here for "how to run the tests".
- **README.md** — top-level entry point that links into the docs tree including this page.

## Notes

- **JSON over JUnit is deliberate.** Vitest emits both; Jest emits only JSON without an extra dependency. JSON carries per-assertion durations, ancestor titles, and full failure messages. Adding a JUnit reporter later would be *alongside*, not a replacement.
- **`scripts/report-test-results.ts` is byte-identical in both repos.** `check:spec-identity` enforces this. Do not diverge the two copies.
- **No cross-repo mapper for test data.** The demo dataset is produced by the backend's `npm run seed:export` (seed → read back through real serializers → publish as JSON). This repo no longer holds its own copy or mapper; the API's serializer is the single source of truth.
- **`db/demo/demo-data.json` is byte-identical across both repos.** It is the API's own output, not a hand-maintained fixture.
- **E2E shard logs exist because of a real loss incident.** stderr piped through `tail` or truncated by a CI log limit makes a failure undiagnosable; the file dump is the recovery path.
- **The demo profile runs against an in-memory Mongo seeded from the backend's fixtures**, not from a local copy — one instance per shard, deterministic because seeds are fixed.
