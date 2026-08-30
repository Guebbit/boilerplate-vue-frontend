# docs/tools/testing-and-docs.md

## Purpose

This is the index ("map") page for the project's testing and documentation layer. It links every test layer (unit, property, cross-cutting, accessibility, visual regression, E2E demo/live, mutation) to its dedicated detail page, explains how to read a test run report, and documents where test data originates across the two repos. Its role is orientation: start here, jump to a layer's detail page, and always return via the cross-links.

## Key elements

- **Layer table** — one row per testing layer (Unit, Component, Property, Cross-cutting, Accessibility, Visual Regression, E2E Demo Profile, E2E Live, Mutation) with the question it answers, the tool(s), the npm command, and a link to the detail page.
- **Mermaid flowchart** — visualises the layer dependency order (Unit → Demo → Live/A11y/Visual; Mutation feeds back into Unit).
- **"Reading a run" section** — documents `npm run test:report` / `scripts/report-test-results.ts`, the JSON (not JUnit) artefact format, and the per-module roll-up output. Notes the `check:spec-identity` guard that keeps the report script byte-identical across both repos.
- **"Where test data comes from" table** — four sources (`db/demo/demo-data.json`, `demo.ts`, `factory.ts`, `contract-data.ts`) and the distinct question each answers.
- **Mermaid data-flow diagram** (truncated in source) — shows the publish/seed pipeline for demo data.

## Relationships

- **docs/tools/testing-quickstart.md** — the quickstart page that a new contributor hits before reading this map; this page is the "start anywhere" hub it links back to.
- **docs/tools/tools-explained.md** — explains the broader tooling ecosystem (linters, formatters, etc.); this page is the testing-specific subset within that ecosystem and cross-links to the layer detail pages that `tools-explained` does not cover in depth.
- **Layer detail pages** (`unit-testing.md`, `component-testing.md`, `property-testing.md`, `accessibility-testing.md`, `visual-regression.md`, `demo-profile.md`, `live-e2e.md`, `mutation-testing.md`) — each is a child page linked from the table; each also links back here via its "Related pages" footer.

## Notes

- This file is documentation only — no executable code lives here. The only executable references are npm commands and the `scripts/report-test-results.ts` path.
- The page asserts that `scripts/report-test-results.ts` is **byte-identical in both repos** (frontend and backend); the `check:spec-identity` script enforces this. Any edit here must keep that invariant in mind.
- The "no mapper" property is called out as something to protect: demo data is published as the API's own serialised output, not as raw inputs that each repo maps independently.
- The Mermaid diagram at the bottom of the file is truncated in the source; the full diagram likely shows the seed/publish flow for `demo-data.json`.
- E2E shards that fail also dump full Cypress output to `reports/e2e/shard-<n>.log` as a safety net against stderr truncation — this is an operational detail, not a code export.
