---
source: src/app/tours/AppTourHost.vue
sha256: 4367c3d2621dd0f66d07c0a20975bee7993fcd68ee0f3756353b96f3de06877a
signature: f6e52de88425b69a317f60c802e77b18d59cb861a0ef8f6312daddc4605bcd8c
generated_at: 2026-11-10T02:57:04.069837+00:00
model: ollama:qwen3.8:27b
---

# src/app/tours/AppTourHost.vue

## Purpose

A headless component (renders only a hidden `<span />`) that centralises the two triggers for opening a guided tour: the user's first sign-in on a given browser (welcome tour) and an explicit `?tour=<id>` query parameter. By living as a single always-mounted watcher, any part of the app can request a tour simply by setting that query param, and the welcome tour fires automatically without per-screen boilerplate.

## Key elements

- **`open(tourId)`** – Calls `startTour(tourId)` from `useTour`; catches any rejection (e.g. a failed driver.js chunk), logs it via `warn`, and resolves to `false` so the promise never escapes into a watcher.
- **`requestedTour()`** – Reads `route.query.tour`; returns the value only if it is a single string (not an array from a repeated param).
- **`abilitiesLoaded()`** – Returns `true` once `session.tenantAbility.rules` is non-empty, indicating the nav (and thus tour anchors) has rendered.
- **Watch on `requestedTour`** – When a known tour id appears in the query, strips the param via `router.replace`, then calls `open`. Unknown ids are silently ignored. Runs with `{ immediate: true, flush: 'post' }`.
- **Watch on `[viewer.id, abilitiesLoaded(), route.name]`** – Triggers the welcome tour exactly once: requires a resolved account, loaded abilities, a route other than the sign-in screen, no concurrent `?tour=` param, and `hasSeen(WELCOME_TOUR_ID)` to be false. Also gated by `readToursEnabled()` and the `auto` flag in the catalogue.
- **`hasSeen`** (from `useTour`) – Persisted flag used to suppress the welcome tour on subsequent visits.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Imports `warn` and calls it with a `'tours'` scope whenever `open` fails or the `router.replace` promise in the query-param watcher rejects, keeping failures visible in the log without crashing the watcher.

## Notes

- The component has **no visible UI**; the template is a single `<span hidden />` purely to satisfy Vue's single-root requirement.
- Both watches use `flush: 'post'` so they run after the DOM has updated (important because the welcome tour needs anchor elements already in the page).
- The `?tour=` param is removed **before** the tour starts (`router.replace` resolves first, then `open` is called), guaranteeing a page reload will not re-trigger the same tour.
- An unknown tour id in the query is dropped silently—no log, no user feedback. Only *known* ids reach `open`.
- The floating-promise in the welcome watch is intentionally un-awaited; the `eslint-disable` comment documents that `open` self-catches.
- Tour feature is gated by `readToursEnabled()` (runtime config) at both entry points, so disabling the flag suppresses all tour activity without removing the component.
