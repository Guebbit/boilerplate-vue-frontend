---
source: src/ui/molecules/CopyButton.vue
sha256: 7c1a1ba609fab26c545295e2c0ce8eb5905893fe478a502d5662db84a030a86d
signature: d3ce17c228aeb05c8e7e684eca1984b3d1c9eb84daa50899d7f45ecd6ae7a29a
generated_at: 2026-11-10T06:26:43.064750+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/CopyButton.vue

## Purpose
A single-purpose icon button that copies a given text string to the clipboard and displays a toast confirming success or reporting failure (via a locale key). It exists so callers get a consistent, always-iconed copy action without managing clipboard or toast logic themselves.

## Key elements
- **Props** — `text` (string to copy), `label` (accessible name for the button), `failureKey` (locale key for the failure toast).
- **`copy`** — obtained from `useCopyToClipboard(failureKey)`; called on click with the `text` prop. Encapsulates the clipboard write and the success/failure toast.
- **`size`** — obtained from `useTouchFriendlySize()`; yields a larger button under touch and a smaller one under mouse.
- **Template** — a single `<v-btn>` (Vuetify) rendered as `variant="text"`, icon-only, with a `<Copy>` icon (lucide-vue-next, 14 px, `aria-hidden`). `data-test` attributes fall through to this button because it is the sole root.

## Notes
- The button is always icon-only; there is no prop to add text content. The accessible name comes solely from `aria-label` (bound to the `label` prop).
- `failureKey` is expected to already be worded for the specific item being copied (e.g. "Failed to copy URL"); the component does not append any context.
- Because the component is a single-root SFC, `v-bind` / `data-test` from a parent lands directly on the `<v-btn>` with no intermediate wrapper.
