# docs/tools/tools-explained.md

## Purpose

Single-page reference that explains every tool in the project stack — what it is, the problem it solves, and its role in this repo — organised into five colour-coded categories (Build, Runtime, Contract, Testing, Telemetry). It exists so a reader can orient themselves in the tech landscape before diving into per-tool config docs.

## Key elements

- **Mermaid flowchart** — visualises the five subgraphs and the directional rule: *Contract → App, Build → App, App → Telemetry, Testing ⇢ App* (dashed). States the one non-negotiable: generated contract output is never hand-edited.
- **Core stack section** — Vue 3, Vite, Sass/sass-embedded, Pinia, Vue Router, Vue I18n. Each entry follows the *What it is / Problem it solves / In this repo* triad and links out to `./runtime.md` or `./state-and-routing.md`.
- **API & contract tools section** — Orval, Axios, Zod, MSW, Spectral. Highlights that `contracts/rest/` is a generated artifact and that MSW is used only for transport-layer unit specs (not dev/e2e).
- **Observability stack section** — Grafana Faro and Umami. Both are no-op unless their respective `VITE_*` env vars are set; all calls route through `useObservabilityStore()`.
- **Testing tools section** — Vitest + @vue/test-utils, Cypress (and others, truncated in source). Points to `tests/unit/` and e2e spec locations.
- **Cross-references** — each tool entry links to its dedicated config page (e.g. `../api/openapi-workflow.md`, `./demo-profile.md`, `./observability.md`, `./testing-and-docs.md`).

## Relationships

- **docs/tools/testing-and-docs.md** — the Vitest/Cypress entries in this file link to it as the authoritative page for test configuration, conventions, and running instructions. This page provides the *why*; that page provides the *how*.
- **docs/tools/umami.md** — the Umami subsection here links to it for tracker configuration, event naming, and the `VITE_UMAMI_WEBSITE_ID` setup. This page gives the conceptual "what/why"; that page holds the implementation details.

## Notes

- The "Colour is the job a tool does, not the layer it sits in" line in the flowchart is a deliberate framing choice — tools are grouped by *function* (build, runtime, contract, test, observe), not by where they execute.
- The file enforces a single architectural rule via the mermaid arrow: `openapi.yaml` / `asyncapi.yaml` are inputs; `contracts/` is output. Editing generated output is called out explicitly as "the one mistake this diagram exists to prevent."
- MSW is intentionally *not* used for dev or e2e — those flows run against a paired backend's demo profile. This is a non-obvious constraint worth remembering.
- Orval's MSW-stub output is deliberately disabled; see `./demo-profile.md` for the reasoning.
