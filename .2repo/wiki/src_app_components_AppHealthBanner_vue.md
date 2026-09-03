# src/app/components/AppHealthBanner.vue

## Purpose
A thin, always-mounted presentational banner that appears only when the backend API is unreachable. It exists to communicate a *degraded* (not *broken*) state to users, since the app still renders usable content (bundled dictionaries, cached pages) without a live backend.

## Key elements
- **`useLivenessProbe(() => getHealth())`** — polls the `GET /` liveness endpoint (via `getHealth` from `@api`) and exposes a reactive `down` boolean that drives visibility.
- **`getHealth`** (from `@api`) — the sole caller of `GET /` in the entire application; imported here with an explicit `eslint-disable` because the project rule "a component wires, it does not call the API" is intentionally waived for this single-line use.
- **`useI18n()` / `t('generic.api-unreachable')`** — localised user-facing message.
- **`CloudOff`** (lucide-vue-next) — decorative icon, marked `aria-hidden="true"`.
- **`v-system-bar`** — Vuetify system-bar wrapper shown with `color="warning"` when `down` is true.
- **`<div role="status" aria-live="polite" aria-atomic="true">`** — a permanently mounted live region; only its *content* (the `v-system-bar`) is conditionally rendered via `v-if="down"`.

## Relationships
No graph neighbors are recorded for this file. Its only external runtime dependency is the `@api` module (`getHealth`), which is imported directly and is the file's sole consumer.

## Notes
- **Accessibility invariant:** the `aria-live` wrapper must stay in the DOM at all times. Assistive technologies only announce *changes inside* a region they already track; creating the region together with the message (e.g. moving it inside `v-if`) would silence the announcement.
- **Intentional API-call exception:** the eslint restriction on `@api` imports in components is disabled here by comment. If the liveness logic is ever expanded, this is the natural place to extract a composable/store.
- **`data-test="health-banner"`** attribute on `v-system-bar` is the stable hook for E2E / unit-test assertions.
- The component is purely presentational state-display: it performs no retries, no user interaction, and no navigation.
