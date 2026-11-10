---
source: tests/unit/ui/dialog-shell.spec.ts
sha256: b4eb2af4b39374371442cb7247df1a7d28c5cfc506ca26e66d0eaad19ca96a5a
signature: b64f83e5ff895da45532e6c46b643366ea2614e1a0e92dd45c70eebffd76f033
generated_at: 2026-11-10T08:24:42.427247+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/dialog-shell.spec.ts

## Purpose

Unit tests for `DialogShell.vue` (`@/ui/organisms/DialogShell.vue`), the `v-dialog` wrapper that every form dialog sits inside. The tests verify the shell's wiring — heading/ARIA linkage, attribute fall-through, fullscreen binding, and focus restoration — while stubbing Vuetify's overlay so only the shell's own logic is exercised.

## Key elements

- **`vi.mock('@/ui/composables/use-fullscreen-dialog.ts', …)`** — Forces `useFullscreenDialog` to return `ref(true)` (a phone-sized binding) so the fullscreen prop is visibly `true` rather than jsdom's default-width `false`.
- **`VDialogStub`** — Minimal inline component replacing Vuetify's `v-dialog`. Exposes `modelValue` and `fullscreen` as `data-*` attributes on a wrapper `<div>` and renders its default slot. Everything else falls through as native attributes.
- **`mountShell(modelValue)`** — Mounts `DialogShell` with a `<h2 :id="params.titleId">` slot, a fixed set of undeclared attrs (`max-width`, `data-test`, `role`), the `VDialogStub` global, and `attachTo: document.body` so focus assertions work.
- **`settle()`** — Awaits two successive `nextTick` calls to let the return-focus watcher and its internal `nextTick` both resolve.
- **Test: "names the dialog by the heading…"** — Asserts `aria-labelledby` on the stub equals the `id` the slot heading receives.
- **Test: "passes undeclared attributes through…"** — Asserts `data-test`, `max-width`, and `role` land on the stub element.
- **Test: "binds fullscreen from useFullscreenDialog"** — Asserts `data-fullscreen` is `"true"`.
- **Test: "hands focus back to the opener once closed"** — Simulates an opener button, opens/closes the dialog via `setProps`, and asserts `document.activeElement` returns to the opener after `settle()`.

## Relationships

No graph neighbors recorded.

## Notes

- The `useFullscreenDialog` mock hard-codes `true`. If the composable's real return type or signature changes, this mock must be updated in lockstep.
- `attachTo: document.body` is required for the focus-restore test; the `afterEach` cleanup (`document.body.replaceChildren()`) depends on it.
- The `settle` helper is a workaround for Vuetify's (or the shell's) internal `nextTick` before it calls `focus()`. Adding a third tick here would be pointless; if focus assertions become flaky, check for an extra async hop in the shell rather than lengthening `settle`.
- Because `v-dialog` is fully stubbed, no Vuetify overlay, teleport, or portal behavior is covered. Changes to how `DialogShell` interacts with `v-dialog` (e.g., new props, slot names) must be reflected in `VDialogStub` or the tests will silently pass against the wrong surface.
