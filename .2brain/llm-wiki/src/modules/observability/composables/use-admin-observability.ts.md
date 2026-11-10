---
source: src/modules/observability/composables/use-admin-observability.ts
sha256: 1559a7b8f928bcfc92b5c33c0daab242593df944719594e1adeec33ea001a0e1
signature: 18a6400d259b8ca8bebe821d02d6243a58ae87864087fb0dfb002f21823f9cf2
generated_at: 2026-11-10T04:51:56.171076+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/composables/use-admin-observability.ts

## Purpose

Composable that wraps the two read-only endpoints behind the Admin observability dashboard's overview tab (health and metrics overview). It centralises per-panel loading/data/error state and guarantees that each fetch *resolves* (writing into a local error ref) rather than rejecting, so a partially available stack still renders whichever panel answered. Audit-trail fetching is deliberately excluded here; `AdminAuditTab.vue` uses its own `useAuditTrail` for that concern.

## Key elements

- **`UseAdminObservabilityReturn`** (interface) — the exact shape the composable hands back: two payload refs (`health`, `metrics`), two loading refs, two error-message refs, and three fetcher functions.
- **`useAdminObservability()`** (function, sole runtime export) — creates two `useAsyncAction` instances (one per endpoint), exposes their `data`/`error`/`loading` refs, and wraps the `run` callbacks into `fetchHealth`, `fetchMetrics`, and `fetchAll` (parallel via `Promise.all`). All fetchers resolve to `void`; errors are swallowed into the respective error ref.

## Relationships

- **`src/infrastructure/utils/errors.ts`** — provides `getErrorMessage`, passed as the `resolveError` option to both `useAsyncAction` calls to normalise thrown errors into a display string.
- **`src/modules/observability/views/Admin.vue`** — the dashboard view that consumes this composable to render the health and metrics panels.
- **`src/modules/observability/tests/use-admin-observability.spec.ts`** — unit tests covering the composable's state transitions and error-resolution behaviour.

## Notes

- Each `useAsyncAction` is configured with a `fallbackErrorMessage` pulled through `translate()` (`admin-page.error-load-health` / `admin-page.error-load-metrics`), so the i18n key is the last-resort string if `getErrorMessage` returns nothing.
- `fetchAll` is fire-and-forget for the initial render: callers should not `await` it expecting a payload; they read the state refs instead.
- The composable is intentionally **not** a generic "fetch N endpoints" helper — it is hardcoded to exactly these two calls. Adding a third panel here would blur the boundary with `useAuditTrail`.
