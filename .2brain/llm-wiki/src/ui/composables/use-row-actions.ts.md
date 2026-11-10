---
source: src/ui/composables/use-row-actions.ts
sha256: 192f6d63a153eb53bb448556cc37859a6e9c0bea269782b6f7aa08e5e6a01f60
signature: cdd582b7535a4de43a870b33c1fc8f54e8e903741e9e9297becdcaa6c378071d
generated_at: 2026-11-10T06:25:05.443551+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-row-actions.ts

## Purpose

Provides a single composable (`useRowActions`) that standardises the post-write pipeline for any row action in a list (delete, restore, revoke, status change): clear the list's blocking alert → execute the write → toast a success message → optionally run a follow-up (e.g. reload) → funnel any failure back into that alert. A second variant adds a confirm-dialog gate before the write runs.

## Key elements

- **`RowActionErrorSink`** (interface) — the `report` / `clear` pair supplied by the caller. Decouples this composable from the observability layer so `ui` never imports infrastructure reporting directly.
- **`RowActionRequest`** (interface) — describes one write: the `action` promise, the pre-translated `success` toast string, and an optional `afterwards` callback.
- **`ConfirmedRowActionRequest`** (interface) — extends `RowActionRequest` with a `confirm` question string for destructive actions.
- **`UseRowActionsReturn`** (interface) — the shape of the composable's return value: `run` and `runConfirmed`.
- **`useRowActions(sink)`** (exported const) — the composable itself.
  - `run(request)` — clears the alert, awaits `action()`, fires `addMessage(success)`, calls `afterwards?.()`, and catches any error into `sink.report`. Never rethrows.
  - `runConfirmed(request)` — wrapped in `singleFlight` so a second call while the first is still pending (dialog open or write in-flight) is a no-op. On a "no" from the dialog, nothing runs.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — not directly imported here. The dependency-graph edge exists because the caller's implementation of `RowActionErrorSink.report` is where error reporting (and ultimately logging) is performed. This file stays in the `ui` tier and delegates all reporting to the injected sink, satisfying the project's eslint tier rules that forbid `ui` from reaching into observability.

## Notes

- The composable is stateless per list instance but is **bound to one alert sink** at call time; each list view creates its own via `useRowActions(sink)`.
- `runConfirmed` is guarded by `singleFlight` — only the first in-flight call proceeds; subsequent calls while the dialog or write is still active resolve to `undefined` and do nothing.
- All user-facing strings (`success`, `confirm`) are expected to arrive **already translated**; this file performs no i18n.
- `afterwards` runs *after* the success toast, making it the right slot for a filtered-reload that depends on the write having committed.
