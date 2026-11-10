---
source: tests/unit/ui/use-leave-guard.spec.ts
sha256: 2e31d89a8205d30de997e8a65d57cc87641934c181b98eea03aa67611948c0c2
signature: beed5e076654de74a772aedb57f55b12291415ae27163cbe6ee208908c2973cb
generated_at: 2026-11-10T08:30:34.400627+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-leave-guard.spec.ts

## Purpose

Unit tests for the `useLeaveGuard` composable. Verifies that navigation is blocked (via a confirmation dialog) when a staff form is dirty, allowed silently when the form is clean or has just been saved, and suppressed entirely when the user's session has ended. Also asserts correct `beforeunload` (browser-tab-close) behavior tied to dirty state.

## Key elements

- **`registered.guard`** — captured via a `vi.hoisted` + `vi.mock('vue-router')` shim around `onBeforeRouteLeave`; gives tests direct access to the guard function the composable registers.
- **`dirty` (ref)** — the reactive "form is dirty" signal passed into `useLeaveGuard`; flipped per test.
- **`signedIn` (boolean)** — stand-in for session state, passed as the second argument to `useLeaveGuard`.
- **`confirm` (vi.fn)** — spy replacing `useDialogStore().confirm`; resolves to a pre-set `answer` boolean.
- **`scope` (effectScope)** — runs the composable in an isolated Vue effect scope, stopped in `afterEach` so no listeners leak between tests.
- **Test cases (7 `it` blocks):**
  - Clean form → guard returns `true`, no dialog.
  - Dirty + user declines → guard returns `false`, dialog called once.
  - Dirty + user accepts → guard returns `true`.
  - `markSaved()` while dirty → guard returns `true`, no dialog.
  - Re-dirty after `markSaved()` + clean → guard asks again.
  - Session over (`signedIn = false`) → guard returns `true`, no dialog.
  - `beforeunload` event: only `defaultPrevented` while dirty; silent when clean or after `markSaved()`.

## Relationships

No graph-neighbor files are registered for this spec in the dependency graph. The file's imports (`useLeaveGuard`, `useDialogStore`, `vue-router`, Pinia, Vue reactivity primitives) are exercised here but do not appear as tracked neighbors.

## Notes

- The guard is invoked **synchronously** in most tests (expects `true`/`false` directly) but **asynchronously** in the dirty-and-asks cases (the guard is expected to return a Promise). Tests must `await` in those paths.
- The `beforeunload` test dispatches real `Event` objects on `globalThis` and checks `defaultPrevented`; it relies on `await nextTick()` after flipping `dirty` so the composable's reactive listener has time to attach/detach.
- `guard` is typed via `ReturnType<typeof useLeaveGuard>` but the `?? { markSaved: ... }` fallback in `beforeEach` suggests the composable *can* return `undefined` under some condition not exercised here.
