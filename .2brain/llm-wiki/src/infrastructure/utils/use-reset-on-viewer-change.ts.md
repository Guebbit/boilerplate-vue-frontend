---
source: src/infrastructure/utils/use-reset-on-viewer-change.ts
sha256: dda974ce0b02c8d3ba65aadbc7998a00ae00262eee4c0028ff0f4b63f299ae1a
signature: b2b6496becdc600bafd9f851cc3ff895c2f48eb0ad57637f822a5aead5a6321c
generated_at: 2026-11-10T03:15:27.509870+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-reset-on-viewer-change.ts

## Purpose

A small Vue composable that prevents per-person Pinia store data (cart, wishlist, etc.) from leaking into the next visitor's session on the same tab. It watches the signed-in viewer's ID and invokes a caller-supplied `reset` whenever the person changes or leaves.

## Key elements

- **`useResetOnViewerChange(reset: () => void): void`** — The sole export. Subscribes (via Vue `watch`) to `session.viewer?.id` and calls `reset()` when the ID transitions from one defined value to a different one or to `undefined`. The first sign-in (previous is `undefined`) is intentionally skipped so no spurious reset fires on initial load.

## Relationships

No graph neighbors recorded.

## Notes

- The watch source is the *string/ID* `session.viewer?.id`, not the whole viewer object. Unrelated field mutations on the viewer will **not** trigger a reset.
- A same-person record refresh (ID unchanged) is a no-op; the callback fires only on an actual ID transition.
- The hook assumes the store's `reset` empties *per-person* state; it does not reset app-wide or server-side state.
- Cross-tab logouts are covered implicitly: they clear the viewer in the shared session store, which drives the same `id → undefined` transition here.
