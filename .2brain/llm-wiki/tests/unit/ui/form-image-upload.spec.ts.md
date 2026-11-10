---
source: tests/unit/ui/form-image-upload.spec.ts
sha256: c03e6124cdb099e4db05de2860be506199ddb62f0dd0581b537141cfbadc0b04
signature: cbcf01cfd67518278b4a77b50c80dd67eb405f16c421facc1c0b696bb0123dfb
generated_at: 2026-11-10T08:25:53.893671+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/form-image-upload.spec.ts

## Purpose

Unit tests for the `FormImageUpload.vue` component, focusing on behaviors that are invisible in the UI but leak resources or violate the single-file contract: object-URL creation/revocation across the three mutation paths (replace, clear, unmount), preview URL resolution, progress-bar visibility semantics (`0` vs `undefined`), and array-to-single-file collapse. Exists because the component owns a browser resource (`URL.createObjectURL`) whose failure to release is silent and accumulates over a session.

## Key elements

- **`served(path)`** — Builds an absolute preview URL by prefixing the axios instance's `baseURL`, so expectations track the real config rather than a hardcoded origin.
- **`created` / `revoked` (module-level arrays)** — Record every object URL minted and revoked during a test; reset in `beforeEach` alongside the `URL.createObjectURL`/`revokeObjectURL` stubs.
- **`makeFile(name?, type?)`** — Returns a minimal `File` with a 3-byte body.
- **`mountUpload(props?)`** — Mounts `FormImageUpload` with Vuetify and i18n plugins; the single entry point for all tests.
- **`describe('…the object-URL resource')`** — Asserts exactly one URL is minted per pick, and that revocation happens on replace, clear, unmount, and is skipped when nothing was picked.
- **`describe('…the preview')`** — Asserts `img[src]` shows the existing image, prefers a new pick, renders nothing when empty, and falls back to existing on clear.
- **`describe('…the progress bar')`** — Asserts the bar is absent when idle, *present* at `progress === 0`, and that `aria-valuenow` rounds fractional values.
- **`describe('…the field')`** — Pins the `accept` attribute to `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`, error-message rendering, `disabled` passthrough, and array→single-file collapse.

## Relationships

- **`tests/support/stub.ts`** — Imports `asStub` to type-cast the array `modelValue` in the collapse test without runtime overhead.
- **`tests/support/unit/mounted-vm.ts`** — Imports `nextRenderTick` to flush Vue render cycles after `setProps` before asserting.

## Notes

- Progress-bar assertions target `[data-testid=upload-progress]`, **not** `.v-progress-linear`: Vuetify's `v-file-input` renders its own internal bar with that class, so a class-based selector matches in both the visible and hidden states and asserts nothing.
- Rounding is asserted on `aria-valuenow`, not the visible label, because the label is an i18n key that renders literally in unit-test scope (dictionaries are lazy-loaded).
- Object-URL stubbing replaces `globalThis.URL.createObjectURL` / `revokeObjectURL` in `beforeEach`; tests assert on the `created`/`revoked` arrays rather than spy call counts, keeping ordering visible.
- The `served()` helper reads `instance.defaults.baseURL` from the live axios client so the spec cannot pass by coinciding with a stale `.env` value.
