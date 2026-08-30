# tests/unit/ui/form-image-upload.spec.ts

## Purpose

Unit tests for `FormImageUpload.vue`, focusing on the object-URL lifecycle (create/revoke), preview image selection, upload progress-bar visibility and value, and the file-input field contract. The component wraps well-tested upload utilities but owns a browser resource (`URL.createObjectURL`) that no other test exercises, so this file pins the three revoke paths (replace, clear, unmount) and the few behaviours a naive implementation gets backwards.

## Key elements

- **`served(path)`** — builds the absolute preview URL by prefixing the axios instance's `baseURL`, avoiding a stale `.env` in the expectation.
- **`created` / `revoked` arrays** — module-level bookkeeping that records every `createObjectURL` / `revokeObjectURL` call; reset in `beforeEach`, used to assert revoke happened (or didn't).
- **`makeFile(name?, type?)`** — returns a minimal `File` blob for prop injection.
- **`mountUpload(props?)`** — mounts `FormImageUpload` with Vuetify and i18n plugins; the sole mount helper.
- **`describe('…object-URL resource')`** — five tests covering: single create, revoke-on-replace, revoke-on-clear, revoke-on-unmount, and no-revoke-when-never-picked.
- **`describe('…preview')`** — four tests covering: shows stored image, prefers picked file, no `<img>` when neither exists, falls back to stored image after clear.
- **`describe('…progress bar')`** — five tests covering: hidden when idle, shown at `0` (not the same as idle), shown mid-upload, fractional rounding, whole-number exactness.
- **`describe('…field')`** — four tests covering: `accept` attribute matches `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`, validation error text renders, `disabled` prop propagates, array selection collapses to a single `File`.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub`, used in the array-collapsing test to cast a `File[]` as a single `File` so the component's `modelValue` setter accepts it.
- **`docs/tools/component-testing.md`** — the "counted stub" pattern used here (tracking create/revoke calls in module-level arrays rather than spying on the component's internal method) follows the approach documented there for testing browser-resource lifecycles.

## Notes

- **Progress-bar selector is `[data-testid=upload-progress]`, never `.v-progress-linear`.** Vuetify's `v-file-input` renders its own progress bar inside the field loader, so a class-based selector matches even when the component's bar is absent, making the assertion vacuous.
- **`progress === 0` is a distinct state from `undefined`.** `0` means the request has started and sent nothing; `undefined` means idle. A truthiness check collapses them, and the spec pins the distinction explicitly.
- **Fractional rounding is asserted on `aria-valuenow`, not the visible label.** The label is an i18n message whose dictionary loads lazily, so in a unit test it renders as the raw key. `aria-valuenow` is also what a screen reader announces.
- **Array-collapsing test enforces the API contract.** Every `imageUpload` field declares a single file; Vuetify's `v-file-input` types its model as `File | File[] | null` because it covers the `multiple` case. The component must collapse the array before emitting, and this spec is the only guard against a regression.
- **`served()` derives from `instance.defaults.baseURL`.** Hardcoding an origin in the expectation would let a spec pass against a stale `.env` and fail in CI where the API origin differs.
