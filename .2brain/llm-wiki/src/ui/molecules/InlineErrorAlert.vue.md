---
source: src/ui/molecules/InlineErrorAlert.vue
sha256: 9aa1e06422c6ee30dd2811c81f85a169cdc4d72a2da54a066df6ef9797a6d58f
signature: 9aa1e06422c6ee30dd2811c81f85a169cdc4d72a2da54a066df6ef9797a6d58f
generated_at: 2026-11-10T06:27:17.802119+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/InlineErrorAlert.vue

## Purpose

Single-root Vuetify alert for displaying blocking-workflow errors or warnings inline within a form. It exists as a dedicated component (rather than a toast) because `role="alert"` triggers an immediate screen-reader announcement at the point of focus, which a toast queue cannot provide after the user's attention has moved. It is the rendering half of the `useBlockingError` composable pairing.

## Key elements

- **`message` prop** (optional `string`) — the alert text. When `undefined` the component renders nothing (controlled by `v-if="message"` on `<v-alert>`); callers bind it directly to `useBlockingError().message` without adding their own conditional.
- **`type` prop** (`'error' | 'warning'`, default `'error'`) — maps to Vuetify's alert variant. `'warning'` signals an expected absence (e.g. a lookup that matched nothing); `'error'` signals an actual failure. Intended to be bound to `useBlockingError().type`.
- **`<v-alert>` root** — the sole element in the template, with `density="compact"` and `role="alert"`. All extra attributes (including `data-test`) fall through to this element.

## Relationships

No graph neighbors are recorded for this file. Its logical counterpart is the `useBlockingError` composable (referenced in the JSDoc), which supplies the `message` and `type` values this component renders.

## Notes

- **No `testId` prop.** Because the component has exactly one root element, `data-test="…"` is passed through as a regular attribute to `<v-alert>`, matching the convention used by every other single-root molecule in this UI kit.
- **Caller responsibility:** the caller is expected to bind `message` and `type` straight from `useBlockingError()`; the component itself contains no logic beyond the `v-if` guard.
- **Vuetify dependency:** the component assumes `v-alert` is globally registered (or resolved via the project's Vuetify setup); it is not imported locally.
- **Inline vs. toast guidance:** see `docs/theory/request-flow.md` for which failures belong here versus in a toast.
