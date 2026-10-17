---
source: src/modules/account/components/PasswordStrengthMeter.vue
sha256: c2d331c54e350dc1ac67ca54e65cd0dc42885ee2c0d7fe9619f4973e9f4abfc0
generated_at: 2026-10-17T00:15:09.526614+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/PasswordStrengthMeter.vue

## Purpose

A purely visual, advisory password-strength indicator (progress bar + text label) that reflects a zxcvbn score supplied by `usePasswordStrength`. It renders nothing for an empty password and never blocks form submission; actual enforcement is delegated to schema validation and server-side checks.

## Key elements

- **`props.password: string`** — The candidate password to score; read reactively into the composable.
- **`STRENGTH_LEVELS`** — A 5-element array mapping zxcvbn scores 0–4 to a Vuetify color (`error` × 2, `warning`, `success` × 2) and an i18n key suffix.
- **`percent` (computed)** — Bar fill as a percentage: `(score + 1) / 5 * 100`; `0` when score is `undefined`.
- **`color` (computed)** — Vuetify color for the current bucket; `undefined` when there is nothing to score.
- **`label` (computed)** — Translated strength label via `t('users-form.…')`; `undefined` when score is `undefined`.
- **Template** — `v-progress-linear` (height 6, rounded, `aria-hidden`) plus a `<p aria-live="polite">` label. The whole block is hidden (`v-if`) when `password` is empty. Exposes `data-test="password-strength-meter"`.

## Relationships

- **`use-password-strength.ts`** — Imported composable; receives `computed(() => props.password)` and returns `{ score }` (a zxcvbn 0–4 integer or `undefined`).
- **`ProfilePasswordChange.vue`** — Consumes this component to show a live meter beside the password input.
- **`PasswordResetConfirm.vue`** — Consumes this component for the reset-password flow.
- **`Signup.vue`** — Consumes this component during registration.
- **`password-strength-meter.spec.ts`** — Unit tests targeting this component's rendering and reactivity.

## Notes

- The breach-check warning (`use-password-breach-check.ts`) is a **separate** component rendered alongside this one; it is intentionally not duplicated here.
- i18n keys are namespaced under `users-form.` (e.g. `users-form.password-strength-weak`), not a component-local namespace.
- The progress bar itself is `aria-hidden="true"`; the accessible announcement is carried by the `<p aria-live="polite">` label below it.
- Scores 0 and 1 both map to the `error` color, so the bar shows the same red for "very weak" and "weak" — distinguished only by the label text.
