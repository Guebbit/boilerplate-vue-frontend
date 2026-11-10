---
source: tests/unit/ui/inline-error-alert.spec.ts
sha256: f5df195e656c1edef2cca249160cbd46f5d80fcaa8764b150d4e34ccf66cc7c6
signature: e98cf101ecabc0c6476f3117b9075546faa7982c592a19ccb2e99f53c8695adf
generated_at: 2026-11-10T08:26:36.605420+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/inline-error-alert.spec.ts

## Purpose
Unit test for `InlineErrorAlert.vue` covering its single render boundary (whether a `message` prop causes output) and confirming that type/attribute pass-throughs work as expected. The test philosophy, stated in the file's header comment, is to test the boundary in isolation and verify pass-throughs rather than re-testing the underlying `v-alert`.

## Key elements
- **`mountAlert(props?)`** – helper that mounts `InlineErrorAlert` with `@vue/test-utils` and the shared Vuetify plugin; accepts an optional props override.
- **`describe('InlineErrorAlert — the render boundary')`** – two cases: no `[role=alert]` element when `message` is absent; the element and its text appear once `message` is set.
- **`describe('InlineErrorAlert — the pass-through props')`** – three cases:
  - Defaults to the `text-error` class.
  - Accepts `type: 'warning'` and renders `text-warning`.
  - A `data-test` attribute passed via mount `attrs` lands on the rendered alert element.

## Relationships
No graph neighbors are recorded for this file.

## Notes
- The test deliberately avoids asserting on the internal `v-alert` structure; it targets the public `role="alert"` attribute and Vuetify utility classes.
- The `data-test` case mounts the component a second time with a separate `mount` call (not `mountAlert`) to use the `attrs` option, since `mountAlert` only forwards `props`.
- The file uses `vitest` globals (`describe`, `expect`, `it`) imported explicitly rather than relying on a global setup.
