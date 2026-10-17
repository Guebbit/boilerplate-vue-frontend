---
source: tests/unit/ui/form-image-upload.spec.ts
sha256: edee515a4e6549d7f207fc641debdb238e178be26fae0eb8d807a4e9fbbbcbc4
generated_at: 2026-10-17T02:46:19.372680+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/form-image-upload.spec.ts

## Purpose

Unit tests for `FormImageUpload.vue`, the component that owns a blob-URL resource (via `URL.createObjectURL`/`revokeObjectURL`). The spec pins the three leak scenarios (replace, clear, unmount), preview precedence, the `progress === 0` vs `undefined` distinction, and field-level behavior (accept attribute, array collapsing, disabled state). It exists because none of these failures surface elsewhere—especially the resource leaks, which are invisible in the UI until a long session accumulates unreleased images.

## Key elements

- **`served(path)`** — Builds the absolute preview URL by prefixing the axios instance's `baseURL`. Derived from the live instance so the spec cannot pass against a stale `.env`.
- **`created` / `revoked` (module-level arrays)** — Bookkeeping for the stubbed `URL.createObjectURL` / `URL.revokeObjectURL`; assertions compare membership to detect a missed revoke.
- **`makeFile(name?, type?)`** — Returns a tiny 3-byte `File` of type `image/png`.
- **`mountUpload(props?)`** — Mounts `FormImageUpload` with the Vuetify and i18n plugins; `props` override defaults.
- **`describe("…object-URL resource")`** — Five tests asserting exactly one URL is minted and that revocation fires on replace, clear, unmount, and *not* on unmount-without-pick.
- **`describe("…preview")`** — Four tests covering existing-image display, picked-file precedence, no-image state, and fallback after clear.
- **`describe("…progress bar")`** — Five tests asserting visibility rules (`undefined` hides, `0` and `42` show) and rounding via `aria-valuenow`.
- **`describe("…field")`** — Four tests for the `accept` attribute, validation-error surfacing, `disabled` state, and collapsing a `File[]` selection to a single `File`.

## Relationships

- **`tests/support/stub.ts`** — Provides `asStub`, used in the "collapses an array selection" test to cast a `File[]` to `File` so TypeScript accepts the prop assignment that simulates Vuetify's `File | File[] | null` model.
- **`tests/support/unit/mounted-vm.ts`** — Provides `nextRenderTick`, awaited after every `setProps` call to let Vue flush reactivity before assertions read DOM state.

## Notes

- Progress-bar assertions target `[data-testid=upload-progress]`, **not** `.v-progress-linear`. Vuetify's `v-file-input` renders its own progress bar inside the field loader, so the class selector matches even when this component's bar is absent, making the assertion vacuous.
- `progress === 0` must be tested explicitly against `undefined`; a truthiness check (`v-if="progress"`) would hide the bar at the moment a request has started but sent no bytes.
- Percentage assertions use `aria-valuenow` rather than the visible label because the i18n dictionary is lazily loaded and the label renders as the raw key in a unit-test environment.
- The `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE` import from `@/infrastructure/utils/uploads` is asserted against the DOM `accept` attribute to pin the derivation chain (constant → component prop → attribute) in one place.
