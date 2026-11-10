---
source: src/ui/vuetify/field-error.ts
sha256: 180c53642a6d0f3f35a8571b6bcbcb231a4733295bd72e3bffdbe3c746006025
signature: 833be4589f6e42b3b0da76b77ac7fb7e0f97b204e4d236f99e8504c56c04d1ba
generated_at: 2026-11-10T06:33:45.043714+00:00
model: ollama:qwen3.8:27b
---

# src/ui/vuetify/field-error.ts

## Purpose

Provides a single helper that converts a field's error messages into the two props Vuetify (and assistive tech) need: the visible `error-messages` and the `aria-invalid` attribute. Centralizing this avoids repeating the same two-key object literal on every form field.

## Key elements

- **`fieldErrorProps(errors)`** — Accepts `string | readonly string[] | undefined`. Returns `{ 'error-messages', 'aria-invalid' }`:
  - `'error-messages'` — the errors array (or `[]` when undefined).
  - `'aria-invalid'` — `'true'` only when at least one message exists; otherwise `undefined` (attribute omitted).
- Designed to be spread with `v-bind` on a Vuetify form-field component.

## Relationships

No dependency-graph neighbors. The file is a leaf utility with no imports; it is consumed by whichever form-field components choose to bind its output.

## Notes

- `aria-invalid` is set to the string `'true'`, not a boolean, matching the ARIA attribute contract (any non-empty string value means "true").
- An empty string `''` passed as `errors` is treated as **invalid** because `errors.length > 0` is false but the truthiness check `errors &&` passes — however, since `''` has length 0, `aria-invalid` will be `undefined`. In practice callers should pass `[]` or `undefined` for the valid case.
- The return type pins `aria-invalid` to `'true' | undefined`; it is never the string `'false'`, which is the correct ARIA pattern (absence of the attribute means valid).
