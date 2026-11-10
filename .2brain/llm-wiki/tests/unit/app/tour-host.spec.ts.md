---
source: tests/unit/app/tour-host.spec.ts
sha256: 82411cd26a4ee10cc0be0259faee3a7b4e7e5510a56d8ad7cadeb6d6d56cc4a6
signature: 49a08a118d0d5435dcc42be3221a59660524feaddadc513841bc2dd5d237abdf
generated_at: 2026-11-10T07:51:04.934944+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/tour-host.spec.ts

## Purpose

Unit tests for `AppTourHost.vue`, verifying the two triggers that open a tour: the one-time welcome tour for a newly-signed-in user (gated on abilities loading, never on the sign-in screen, never repeated) and the `?tour=` query-parameter mechanism (known ids open and strip the param, unknown ids are silently dropped). `useTour` is fully mocked so driver.js internals are out of scope here.

## Key elements

- **`startTour` / `seen`** – Module-level mocks standing in for the real `useTour` hook; `startTour` records calls, `seen` tracks which tour ids the user has already seen.
- **`vi.mock('@/app/tours/use-tour.ts', …)`** – Factory mock returning `{ startTour, hasSeen }` backed by those two variables.
- **`page`** – Minimal stub component (`<p>page</p>`) used as a route target.
- **`makeRouter()`** – Builds a `createMemoryHistory` router with `Home` (`/`) and `Login` (`/login`) routes.
- **`mountHost(path?)`** – Pushes the router to `path`, mounts `AppTourHost` with that router, flushes promises, and returns `{ router, wrapper }`.
- **`signIn(rules: number)`** – Populates the Pinia session store with a fake viewer and `rules` packed ability rows (so `abilities.tenant.length > 0` when `rules > 0`).
- **Test cases** (7) – Welcome tour fires for a signed-in user with abilities; stays silent for a guest, for a user with zero abilities, for an already-seen tour, or on the `/login` route; opens a known `?tour=` value and strips it while preserving other query params; drops an unknown `?tour=` without calling `startTour`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `useTour` is intentionally mocked here; actual tour-step rendering and driver.js behaviour are covered in `tours.spec.ts` (referenced in the module doc comment).
- `seen` is a mutable module-level `Set` cleared in `beforeEach`—tests that mark a tour as seen (e.g., "does not reopen") depend on this shared state.
- `signIn(0)` produces a session with an empty `tenant` array, simulating the "abilities not yet arrived" window rather than a logged-out state.
- The `?tour=` tests verify the router's query object after the host runs, confirming the parameter is removed via a route update (not just deleted from the DOM).
