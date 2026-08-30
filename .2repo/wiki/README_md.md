# README.md

## Purpose

Entry-point document for the `boilerplate-vue-frontend` repository. It orients a new reader in under a minute—quick-start commands, a one-diagram architecture sketch, and a table of contents into `docs/`—and explicitly defers to that documentation as the authoritative reference. It exists so that neither humans nor AI assistants need to guess where to look first.

## Key elements

- **Quick-start block** – `npm ci`, `.env` copy, backend demo profile, and `npm run dev`; the minimal path to a running storefront on `:8080`.
- **Architecture mermaid diagram** – `openapi.yaml` / `asyncapi.yaml` → generated client + Zod schemas → Pinia stores → Views → Vue Router (locale-prefixed); dashed edge to the backend's in-memory demo profile.
- **Four design pillars** – contract-as-source, module-as-typed-value, first-class mock mode, and a full test suite (unit, component, e2e, a11y, visual, property, mutation).
- **Directory map** – `src/modules/*`, `src/kernel`, `src/infrastructure`, `src/app`, `src/ui`, `contracts/` (generated, never hand-edited).
- **Documentation index ("The map")** – task → doc-file lookup table covering setup, reading order, architecture, module lifecycle, OpenAPI/AsyncAPI workflows, env config, scripts, tooling, testing, roadmap, and deployment.
- **Pre-commit gate** – `npm run complete` (lint, spec lint, contract identity, format, build, unit, e2e) and `npm run complete:manual` (pixel diff, live-backend e2e).
- **License** – AGPL-3.0.

## Relationships

- **`asyncapi.yaml`** – Named as one of the two contract files that generate the realtime type definitions consumed by Pinia stores.
- **`docs/getting-started.md`** – Linked repeatedly ("Start here", "Getting Started" row in the map) as the expanded setup guide covering both demo and compose modes, the port map, and the pre-commit gate.
- **`docs/theory/reading-path.md`** – Called out as the recommended first-time code-reading sequence (nine files, in order).
- **`docs/theory/modules.md`** – Linked for understanding the module architecture shape.
- **`docs/theory/module-lifecycle.md`** – Linked for the add/remove-a-domain procedure.
- **`docker-compose.yml`** – Referenced as the "full stack (compose)" option for real Redis/queue behaviour.
- **`docker-compose.production.yml`** – Listed under the "Deploy it" row alongside `.docker/Dockerfile.production`.

## Notes

- The file states there is "no backend-less mode" for the dev server, yet also lists "the app runs without its backend" as a design pillar. The reconciliation: the dev workflow expects a paired API (demo profile or compose), while mock mode is a build-level capability of the app itself.
- `contracts/` is generated output; editing it by hand will be overwritten.
- `npm run complete` takes roughly ten minutes (Cypress is the bottleneck); `npm run complete:fix` auto-corrects lint/format instead of just reporting.
- Node.js 22+ is a hard requirement.
