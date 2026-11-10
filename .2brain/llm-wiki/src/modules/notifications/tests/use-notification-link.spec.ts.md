---
source: src/modules/notifications/tests/use-notification-link.spec.ts
sha256: f687dceb9034ae1b02f1a42f20976400ebb0626d71fcfdec913a1006ec02b7a4
signature: 04fb3e0665d59797e826c97648fc704fbc815e94b3cd388fdb6cd7d14769680d
generated_at: 2026-11-10T04:50:34.245115+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/use-notification-link.spec.ts

## Purpose

Vitest spec that verifies the `useNotificationLink` composable resolves notification targets (named routes and relative paths) into valid route locations, correctly rejecting targets that don't exist in the build or that the current reader lacks permission to open.

## Key elements

- **`router`** – A `createRouter` instance backed by `createMemoryHistory`, defining three routes: `TaskDetail` (open), `Secret` (gated by `meta.can: ['read', 'Example']`), and a `/:catchAll(.*)` catch-all mirroring the app's 404.
- **`renderNothing`** – A no-op render function; the host component exists solely to provide a composition context for the composable.
- **`mountLink`** – Helper that mounts a `defineComponent` with the test router, calls `useNotificationLink()` inside `setup`, and returns the resulting link function for direct assertion.
- **`describe('a named target')`** – Four tests: valid named route with params, unknown route name, gated route denied, and no target at all.
- **`describe('a path target')`** – Four tests: query-string preservation in the resolved string, catch-all-only path rejected, gated path denied, and gated path allowed once the session's `tenantAbility` grants `read` on `Example`.

## Relationships

- **`src/modules/notifications/composables/use-notification-link.ts`** – The composable under test; every assertion in this file exercises its return value.

## Notes

- Permissions are driven by CASL `createMongoAbility`; the default `beforeEach` grants an **empty** ability (deny-all), so most gated tests start from the "denied" state. The one positive-permission test must explicitly set `accessToken`, `viewer`, **and** a non-empty `tenantAbility`.
- Path targets are tested as **relative strings** (e.g. `'tasks/t1?tab=open'`), not absolute URLs. The assertion checks the resolved string begins with `^/[a-z]{2}/tasks/t1` (locale prefix) and retains the query string, reflecting that the composable returns a string form rather than a route-object for paths.
- The catch-all route in the test router mirrors the real app's 404; any path that only matches that route is expected to be dropped by the composable.
