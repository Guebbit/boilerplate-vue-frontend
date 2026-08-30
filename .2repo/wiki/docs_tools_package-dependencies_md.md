# docs/tools/package-dependencies.md

## Purpose

A reference map of every `package.json` dependency, grouped by concern (runtime vs. dev) so a reader can quickly identify *why* a package is present and which deeper doc to follow for details.

## Key elements

- **Runtime dependencies table** – Vue stack (`vue`, `pinia`, `vue-router`, `vue-i18n`), `axios`, `zod`, Grafana Faro SDKs, Guebbit shared toolkits; each row links to the page that explains the package's role.
- **Dev dependencies table** – Build toolchain (Vite, sass), codegen (`orval`, AsyncAPI CLI), linting (`spectral-cli`, ESLint suite), testing (`vitest`, `msw`, `cypress`), formatting (`prettier`), docs (`vitepress` + Mermaid).
- **"Quick take" summary** – three bullet points reinforcing that runtime deps are intentionally minimal and that Grafana/Umami integrations are no-ops without env vars.
- **"Related pages" links** – points to `package-scripts.md` and the `api/` directory for script definitions and OpenAPI workflow docs.

## Relationships

- **docs/tools/observability.md** – This page's Observability row links to it as the "Read more" target; it is the canonical deep-dive for Grafana Faro and Umami usage.
- **docs/index.md** – Serves as the top-level entry point; this page is reachable from the index's tools section, making it a first-stop when an AI or human needs to answer "what does this project depend on?"
- **docs/tools/mutation-testing.md** – Sibling page under `docs/tools/`; both document developer tooling but cover disjoint concerns (package inventory vs. mutation-testing configuration). No direct link between them in this file, but they share the same parent navigation context.

## Notes

- The file is a *map*, not an install guide. It does not list versions, lockfile specifics, or install commands—those live in `package.json` itself.
- The "Realtime" row has an em-dash in the Packages column; the actual implementation uses native browser SSE APIs with no dedicated package, so no dependency appears here.
- "Read more" links are relative paths into `docs/api/` and `docs/tools/`; if a linked page is missing, the cross-reference will 404 in the VitePress site.
