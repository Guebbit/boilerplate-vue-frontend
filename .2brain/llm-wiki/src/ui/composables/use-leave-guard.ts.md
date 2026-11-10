---
source: src/ui/composables/use-leave-guard.ts
sha256: 8abee45a9a84416014511eedaf06cc62390861ed95a22fb5882a98d9942af2d3
signature: 43e6c58e32f89102e5109fe52ef3a310819344a391cd9d3bec0e9d47f3ca7e8d
generated_at: 2026-11-10T06:23:55.698859+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-leave-guard.ts

## Purpose

A design-system composable that prevents a user from accidentally discarding unsaved form input. It intercepts in-app route changes (via the shared confirm dialog) and browser-level unloads (via the native `beforeunload` prompt), but stays silent when there is nothing to lose—the form is clean, was just saved, or the session has already ended.

## Key elements

- **`useLeaveGuard(isDirty, isSignedIn)`** — the main composable. Accepts a reactive dirty flag (from `useStructureFormValidation`) and a callback that reads the current sign-in state. Returns a `UseLeaveGuardReturn` object.
- **`UseLeaveGuardReturn.markSaved()`** — call after a successful save. Suppresses the leave prompt even though the form still reads dirty (common on create-pages that navigate away immediately after saving). The flag auto-clears once the form next reads clean.
- **`onBeforeRouteLeave` hook** — registered per-component; returns a Promise from `dialog.confirm` (or `true` to allow navigation) when `holdsWork()` is true.
- **`warnOnUnload`** — `beforeunload` handler that calls `event.preventDefault()` and sets `event.returnValue = ''` to trigger the browser's own prompt.
- **Conditional `beforeunload` listener** — a `watch` on `holdsWork()` adds/removes the listener only while work would actually be lost, keeping the page eligible for Firefox's bfcache. Cleaned up on scope disposal.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `beforeunload` listener is **registered and unregistered dynamically** (not set once at mount). This is intentional: a permanently attached listener evicts the page from Firefox's back/forward cache.
- `event.returnValue = ''` is required alongside `event.preventDefault()` for Chromium to actually show the prompt; the eslint-disable comment documents this.
- The caller is expected to supply `isSignedIn` as a function (not a ref) so the composable itself never reads the session store—keeping it a pure design-system composable.
- The `saved` flag is a local `ref`, not part of any store; it resets automatically when `isDirty` transitions to `false`.
