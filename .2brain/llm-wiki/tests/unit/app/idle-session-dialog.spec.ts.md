---
source: tests/unit/app/idle-session-dialog.spec.ts
sha256: 0e9afc3079d1bb14f69bd9fbf511145c50db2b48785691f163f96d922d0c8aa2
generated_at: 2026-10-17T02:31:18.771247+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/idle-session-dialog.spec.ts

## Purpose

Unit test for the `IdleSessionDialog` component (the "still there?" staff idle-timeout prompt). It verifies the dialog's lifecycle against a mocked session store: when it opens (within the 2-minute warning window), what its buttons do, and what happens when the countdown expires. The store itself is out of scope — that belongs to `session.spec.ts`.

## Key elements

- **`idle`** — a `ref` simulating the session store's idle state (`{ timeoutMs, lastActiveAt }`). `undefined` represents a non-staff ("shopper") session.
- **`touchSession` / `signalIdle` / `logout`** — `vi.fn()` stubs standing in for the three store actions the dialog can invoke.
- **`vi.mock('@/infrastructure/session.ts')`** — replaces the real Pinia store with an object returning the refs above, so the test controls the clock entirely.
- **`LIMIT_MS`** — `30 * 60_000`, the 30-minute staff idle timeout used to compute `lastActiveAt`.
- **`mountDialog()`** — mounts `IdleSessionDialog` with `vuetify` + `i18n` plugins and a `VDialog` stub (a simple `v-if` wrapper around `<slot>`), avoiding full Vuetify dialog rendering.
- **`withSecondsLeft(seconds)`** — sets `idle.value` so the remaining time equals the given seconds.
- **`beforeEach` / `afterEach`** — activates Vitest fake timers, resets all mocks, loads the `'en'` locale; restores real timers after each test.
- **Six test cases** covering: shopper renders nothing; dialog stays closed > 2 min remaining; dialog opens and shows a live countdown in the warning window; "stay" button calls `touchSession`; "sign out" button calls `logout`; expired clock calls `signalIdle`.

## Relationships

No external graph neighbors. Internal dependencies (via imports):

- `@/app/components/IdleSessionDialog.vue` — the component under test.
- `@/i18n` (`i18n`, `loadLocale`) — provides the locale plugin and loads the `'en'` dictionary before each test.
- `@/ui/vuetify` — Vuetify plugin instance passed to the mount config.
- `@/infrastructure/session.ts` — mocked wholesale; the test never touches the real store.

## Notes

- `undefined` for `idle` is the convention for a **shopper** (non-staff) session; the dialog must render nothing in that case.
- The `VDialog` stub replaces the real Vuetify dialog with a bare `<div v-if="modelValue">`, so assertions target `data-test` attributes on the dialog's children rather than Vuetify's internal DOM.
- All time-sensitive assertions use `vi.advanceTimersByTimeAsync` (not the sync variant) so Vue's reactivity flushes before the expectation runs.
- The warning window is fixed at **2 minutes** before `timeoutMs`; tests pick `lastActiveAt` relative to `Date.now()` at call time, not at mount time, so the window boundary is deterministic under fake timers.
