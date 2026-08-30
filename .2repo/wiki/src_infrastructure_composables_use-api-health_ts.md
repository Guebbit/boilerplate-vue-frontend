# src/infrastructure/composables/use-api-health.ts

## Purpose

A one-line composable that binds the toolkit's generic liveness-probe mechanism to this app's specific health endpoint. All polling, backoff, and browser `online`-event retry logic lives in `useLivenessProbe` (from `@guebbit/vue-toolkit`); this file only declares *which* request counts as the ping.

## Key elements

- **`useApiHealth()`** (named export) — calls `useLivenessProbe(() => getHealth())`. Returns the toolkit's `down` (boolean, true while the last probe failed), `check`, and `stop`. The probe hits `GET /` via the `getHealth` helper from `@api`.

## Relationships

- **`src/app/components/AppHealthBanner.vue`** — Consumes `useApiHealth()` to drive its banner state. The composable exists so the banner component wires to a boolean without importing any API module directly ("a component wires, it does not call").

## Notes

- The file is intentionally placed under `infrastructure/` (not a domain module) because API reachability is a transport concern shared by every domain — same rationale as the axios client and SSE wrapper living here.
- No local state, no watchers, no configuration: the entire "logic" is the single expression passed to `useLivenessProbe`. If the probe cadence or backoff strategy changes, look in the toolkit, not here.
