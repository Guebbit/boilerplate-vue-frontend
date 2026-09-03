# mutation-baseline.json

## Purpose

A generated snapshot of per-file mutation testing scores for the project's source tree. It records the mutation score (0–100) achieved for each tracked file at a single point in time, serving as a baseline against which future runs can be compared to detect regressions or improvements in test effectiveness.

## Key elements

- **`generatedAt`** — ISO 8601 timestamp indicating when this baseline was captured.
- **`files`** — A flat map of relative source file paths → numeric mutation score. Covers all major areas: `src/app` (guards, router), `src/infrastructure` (http, i18n, observability, utils), `src/kernel`, `src/modules/*` (account, admin, cart, delivery, demo, feedback, inventory, locales, orders, payments, products, realtime, users, wishlist), and `src/ui`.

## Notes

- This is a **generated artifact** (indicated by the `generatedAt` field). Do not edit by hand; regenerate via the mutation-testing toolchain.
- Scores of **0** (e.g. `announcer.ts`, `provided.ts`, `use-dictionary-cell-editor.ts`, `schemas.ts` under locales) mean no mutations were killed for that file at capture time — often a signal of missing or weak test coverage.
- The file is self-contained; it has no runtime dependencies and is not imported by application code. It is consumed only by CI tooling or developer-facing dashboards that diff baselines.
