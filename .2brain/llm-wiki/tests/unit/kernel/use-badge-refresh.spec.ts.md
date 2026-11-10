---
source: tests/unit/kernel/use-badge-refresh.spec.ts
sha256: a881e28c04c603f8999aeceb0a839a0a2ea047f414c25367fbeacf90ff5d76b2
signature: 7ec78bfd9a5ddcb1c06650d268b7b45f223a0e55e6223c634cee048ef3be448f
generated_at: 2026-11-10T08:10:56.614415+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/use-badge-refresh.spec.ts

## Purpose

Unit tests for the `useBadgeRefresh` kernel composable. Verifies which events trigger a forced vs. normal badge read, when no read is attempted, how sign-out clears state, and that repeated read failures preserve the badge count while notifying the user only once.

## Key elements

- **`start(id?)`** — Shared setup helper. Creates a reactive `readerId`, mocks `read` (forced boolean arg) and `clear`, mounts the badge via `mountBadge`, returns the host plus the refs/mocks for assertions.
- **`ring(id, code)`** — Inserts a persistent notification row into the `useNotificationsStore` (from `@guebbit/vue-toolkit`) with inbox-source metadata, simulating what the real inbox does.
- **`describe('the badge triggers')`** — Eight cases covering: initial forced read (or none when no reader), re-read on reader switch, clear-on-sign-out, normal read on route push, normal read on tab visibility change, forced read on staff notice code vs. ignored buyer message, unmount stops all listeners, and failure resilience (count kept, single error toast across multiple failed reads).
- **`wireModulesIntoCore()`** — Called once at module scope to register module wiring before any test runs.

## Relationships

- **`tests/support/unit/badge-host.ts`** — Provides `mountBadge` (mounts a minimal host that invokes the composable and returns a handle to the Vue wrapper and router) and `setVisibility` (simulates the browser tab becoming visible or hidden to trigger the visibility watcher).
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, which registers the module-level wiring the composable depends on before tests execute.
- **`tests/cross-cutting/badge-name.spec.ts`, `tests/cross-cutting/form-idiom.spec.ts`** — Peer test files sharing the same support layer (`badge-host.ts`, `wire-modules.ts`); no direct import from this file.

## Notes

- `wireModulesIntoCore()` is called **once** at the top level, not inside `beforeEach`; the Pinia store is recreated per test.
- The `start()` helper resolves `null` reader to `undefined` for the reactive ref — the composable treats both as "no one present."
- The failure test (`read.mockRejectedValue`) pushes two routes to generate three total read attempts (initial + two), then asserts exactly **one** entry in `messages.history` and that `readerId` is unchanged — i.e., a failure must not clear the badge or crash the watcher.
- `ring()` uses `EToastType.PRIMARY` with `persistent: true` and a negative duration (`-1`), mirroring how the real inbox persists notifications for the badge to pick up.
