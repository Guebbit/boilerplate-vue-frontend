---
source: src/infrastructure/utils/use-reset-on-viewer-change.ts
sha256: dda974ce0b02c8d3ba65aadbc7998a00ae00262eee4c0028ff0f4b63f299ae1a
generated_at: 2026-10-02T14:42:53.053007+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-reset-on-viewer-change.ts

## Purpose

Composable that prevents per-person Pinia store data (cart, wishlist, etc.) from surviving a session change. Because Pinia stores live for the lifetime of the tab, data loaded for one visitor would otherwise be visible to the next person who signs in on the same tab. This hook detects a change in the signed-in user and calls the store's own `reset` to wipe that state.

## Key elements

- **`useResetOnViewerChange(reset: () => void)`** — The sole export. Registers a Vue `watch` on `session.viewer?.id`. When the watched id transitions from a defined value to a different defined value (or to `undefined`, i.e. logout), it invokes the caller-supplied `reset` callback. Does nothing on the very first sign-in (no previous id to compare against).

## Relationships

- **`@/infrastructure/session.ts`** — Imports `useSessionStore` to read `session.viewer?.id`. The reset trigger is entirely driven by changes to that id; no other fields of the viewer are observed.

## Notes

- The watch source is a **getter** (`() => session.viewer?.id`), so reactivity fires only on id changes, not on unrelated viewer field updates.
- The reset is deliberately **not** called when `previous` is `undefined` — this means the first sign-in into an empty store is a no-op, avoiding a spurious reset on page load.
- Cross-tab logouts work transparently: they clear the viewer through the same session store, which triggers the same watch.
