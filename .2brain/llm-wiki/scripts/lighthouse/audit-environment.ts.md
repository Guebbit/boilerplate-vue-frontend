---
source: scripts/lighthouse/audit-environment.ts
sha256: c2d231c193b7c289713a141a174202d406e9bb8b6726a3935bb462ca1b2b9be0
signature: c59d0195865e47e55e710c7ec658af927de23fb9a4fdc413ed77e977d13c979c
generated_at: 2026-11-10T02:41:49.109567+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/audit-environment.ts

## Purpose

Defines the fixed, loopback-only environment variables and container-start generator list that the Lighthouse audit build receives. It was extracted from `build.ts` so the unit test suite can import these pure definitions without pulling in the full build pipeline.

## Key elements

- **`AUDIT_BUILD_DIR`** (`'dist-lighthouse'`) — Output folder for audit artifacts; gitignored.
- **`AUDIT_API_URL`** (`'http://localhost:3100'`) — The single-process demo backend every e2e script boots.
- **`DEMO_UMAMI_WEBSITE_ID`** — Fixed UUID matching `.env-example`; not exported.
- **`auditEnvironment(sinkPort)`** — Returns a `Record<string, string>` of Vite env vars. All URLs point to loopback so the audit proves no external host is needed. Uses `sinkCollectUrl`/`sinkScriptUrl` to build FARo and Umami endpoints on the given sink port. Also sets `VITE_TOURS_ENABLED`, `VITE_ROBOTS_INDEX`, and `VITE_SITEMAP_URL`.
- **`generatorScripts(directory)`** — Reads `directory` (expected: `docker/docker-entrypoint.d`), filters filenames matching `/-generate-.*\.sh$/`, sorts them, and returns full paths in run order.

## Relationships

- **`scripts/lighthouse/analytics-sink.ts`** — Imports `sinkCollectUrl` and `sinkScriptUrl` to compose the FARo and Umami URLs inside `auditEnvironment`.
- **`scripts/lighthouse/build.ts`** — The original home of these definitions; now imports them from this module so its own logic stays focused on orchestration.
- **`tests/unit/scripts/lighthouse/audit-environment.spec.ts`** — Unit-tests the exported constants and functions in isolation (possible because this file has no runtime side-effects beyond `readdirSync`).

## Notes

- `auditEnvironment` intentionally overrides any values a developer's `.env` might supply; it is the single source of truth for the audit's network surface.
- `VITE_ROBOTS_INDEX` and `VITE_SITEMAP_URL` are set even though no current script reads them yet (the sitemap/robots lane is anticipated). Leaving them in is harmless but they will become load-bearing once that lane lands.
- `generatorScripts` relies on the `*-generate-*.sh` naming convention in the entrypoint directory; renaming or adding scripts that don't match that pattern will silently exclude them from the audit run.
- The module is side-effect-free at import time (no I/O, no network), which is what makes it safe to import in unit tests.
