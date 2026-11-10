---
source: src/modules/account/components/PasswordStrengthMeter.vue
sha256: c2d331c54e350dc1ac67ca54e65cd0dc42885ee2c0d7fe9619f4973e9f4abfc0
signature: 4f391bd540b4d909dd5cb0fe5d18273bf392b3339df8a3e6f331b7424a09ced6
generated_at: 2026-11-10T03:19:36.459788+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/PasswordStrengthMeter.vue

## Purpose

A read-only, advisory strength indicator (colored progress bar + text label) for a password input. It scores the password via `usePasswordStrength` and maps the 0–4 zxcvbn score to a Vuetify color and i18n label. It never blocks form submission and renders nothing when the password is empty.

## Key elements

- **`props.password: string`** — the candidate password, read reactively.
- **`usePasswordStrength(computed(() => props.password))`** — imported from `../composables/use-password-strength.ts`; provides the `score` (0–4 or `undefined`).
- **`STRENGTH_LEVELS`** — const array of five `{ label, color }` entries (scores 0–4): `error`, `error`, `warning`, `success`, `success`.
- **`percent`** — computed; maps score to a 0–100 % fill across five equal buckets.
- **`color`** — computed; current bucket's Vuetify color, or `undefined` when unscored.
- **`label`** — computed; translated string under the `users-form.password-strength-*` i18n keys, or `undefined`.
- **Template** — a `v-progress-linear` (height 6, rounded, `aria-hidden="true"`) and a `<p aria-live="polite">` with the label. Wrapped in a `div[data-test="password-strength-meter"]` that is hidden via `v-if="password.length > 0"`.

## Relationships

- **`src/modules/account/composables/use-password-strength.ts`** — direct import; supplies the reactive `score` value this component displays.
- **`src/modules/account/components/ProfilePasswordChange.vue`** — consumer; renders this meter alongside its password field.
- **`src/modules/account/views/PasswordResetConfirm.vue`** — consumer; renders this meter in the reset-confirm flow.
- **`src/modules/account/views/Signup.vue`** — consumer; renders this meter during account creation.
- **`src/modules/account/tests/password-strength-meter.spec.ts`** — unit/integration tests targeting this component.

## Notes

- Purely advisory: the component imposes no validation and never prevents submission. Actual enforcement is handled by the form schema and server-side checks.
- Breach-notification is explicitly **not** part of this component; it lives in a separate hint driven by `use-password-breach-check.ts`.
- i18n keys are namespaced under `users-form.password-strength-{very-weak|weak|fair|good|strong}`.
- The `data-test="password-strength-meter"` attribute is the stable selector for e2e/unit tests.
- `v-progress-linear` is marked `aria-hidden="true"` while the adjacent `<p>` carries `aria-live="polite"` — the bar is decorative; the text label is the accessible announcement.
