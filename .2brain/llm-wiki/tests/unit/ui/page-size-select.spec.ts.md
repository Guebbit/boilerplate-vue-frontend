---
source: tests/unit/ui/page-size-select.spec.ts
sha256: 1a25734e93d85cd70c61ce40f13bbbf112897f9520ef61cf3c0c476aebf3038b
generated_at: 2026-10-17T02:47:01.076304+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/page-size-select.spec.ts

## Purpose

Unit tests for `PageSizeSelect.vue`, verifying that the component correctly maps a sizes array into `{ value, label }` items for Vuetify's `v-select`, passes through a caller-supplied label unchanged, exposes a stable `data-test` attribute, and forwards `v-model` bidirectionally. The tests assert against the mounted `VSelect`'s props directly rather than simulating dropdown interaction, because Vuetify teleports the menu overlay to `document.body` (same pattern noted in `reauth-dialog.spec.ts`).

## Key elements

- **`mountSelect(props?)`** — shared mount helper that renders `PageSizeSelect` with a default `label: 'Page size'` and `modelValue: 10`, accepting optional prop overrides.
- **`describe('… the offered sizes')`** — asserts the default 10/25/50 set matches `DEFAULT_PAGE_SIZES` mapped to `{value, label}` objects, and that a caller-supplied `sizes` array replaces the default.
- **`describe('… the label')`** — confirms the label is rendered as-is (no internal i18n).
- **`describe('… the test hook')`** — asserts the `data-test="page-size"` attribute is present on the underlying `VSelect`.
- **`describe('… the model')`** — verifies `modelValue` is forwarded to `VSelect` and that `update:modelValue` emissions pass through unmodified.

## Notes

- Testing strategy deliberately avoids opening the dropdown; all assertions read `VSelect` props or the wrapper's emitted events. This sidesteps the teleport-to-`document.body` behavior shared with `v-dialog` (see `reauth-dialog.spec.ts` for the same rationale).
- `DEFAULT_PAGE_SIZES` is imported from `@/ui/molecules/page-size-options.ts`, which is the single source of truth for the default set.
- The component under test contains no i18n logic; label translation is the caller's responsibility.
