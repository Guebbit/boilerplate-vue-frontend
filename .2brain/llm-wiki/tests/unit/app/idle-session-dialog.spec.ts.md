---
source: tests/unit/app/idle-session-dialog.spec.ts
sha256: 0e9afc3079d1bb14f69bd9fbf511145c50db2b48785691f163f96d922d0c8aa2
signature: f34b380c83977252f78fbb7251b7bb7e03926b12ccc8a22ad11c6ee157619668
generated_at: 2026-11-10T07:46:40.197165+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/idle-session-dialog.spec.ts

## Purpose
Unit tests for the `IdleSessionDialog` component (the "still there?" prompt shown before a staff session times out). The session store is fully mocked so this file validates only the dialog's UI logic—when it opens, what it displays, and which store actions it calls—without exercising the store's own behavior (covered in `session.spec.ts`).

## Key elements
- **`idle`** (ref) — Mock for the session store's idle state; `undefined` represents a shopper (no timeout).
- **`touchSession` / `signalIdle` / `logout`** — `vi.fn()` stubs replacing the three store actions the dialog invokes.
- **`vi.mock('@/infrastructure/session.ts')`** — Factory mock returning the stubs above from `useSessionStore()`.
- **`LIMIT_MS`** — 30-minute constant, the staff default timeout.
- **`mountDialog()`** — Mounts `IdleSessionDialog.vue` with Vuetify + i18n plugins and a lightweight `VDialog` stub (renders slot only when `modelValue` is true).
- **`withSecondsLeft(seconds)`** — Sets `idle.value` so the computed remaining time equals the given seconds.
- **Test cases** (six):
  - Shopper (`idle === undefined`) → dialog never renders.
  - > 2 min remaining → dialog stays closed.
  - Inside the 2-min warning window → dialog opens and shows a live countdown (e.g. `1:39`).
  - "Stay signed in" click → `touchSession` called once.
  - "Sign out" click → `logout` called once.
  - Clock reaches zero → `signalIdle` called (session ended locally).

## Relationships
No graph neighbors are recorded for this file. It imports `IdleSessionDialog.vue`, the i18n module, and the Vuetify instance, but the dependency graph lists no related spec or source files beyond those direct imports.

## Notes
- Uses `vi.useFakeTimers()` per-test; all time advancement is via `vi.advanceTimersByTimeAsync`, not real waits.
- `beforeEach` calls `loadLocale('en')` so i18n strings are deterministic across runs.
- The `VDialog` stub replaces the full Vuetify dialog (which portals to `<body>`), keeping assertions scoped to the component's own DOM via `[data-test]` attributes.
