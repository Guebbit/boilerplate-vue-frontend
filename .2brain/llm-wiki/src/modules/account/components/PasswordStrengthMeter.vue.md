---
source: src/modules/account/components/PasswordStrengthMeter.vue
sha256: f91507a285f6f698d1805cc9a8655b5e332806220c4f1ff4425bec15aff08b02
generated_at: 2026-10-02T12:09:45.896637+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/PasswordStrengthMeter.vue

## Purpose
Renders a live, advisory-only five-segment progress bar and a translated label beneath a password input. It scores the candidate password via `usePasswordStrength` and maps the 0–4 zxcvbn score to a color and i18n label. It never blocks form submission; actual validation is delegated to the schema and server-side checks. It renders nothing when the password is empty.

## Key elements
- **Props** — `password: string` (reactive; the value to score).
- **`STRENGTH_LEVELS`** — A 5-element constant array (index = score 0–4) mapping each bucket to a `password-strength-*` i18n key and a Vuetify color token (`error`, `warning`, `success`).
- **`percent`** (computed) — Converts the 0–4 score to a 20/40/60/80/100 % fill for `v-progress-linear`; returns 0 when `score` is `undefined`.
- **`color`** (computed) — Current Vuetify color token from `STRENGTH_LEVELS`; `undefined` when unscored.
- **`label`** (computed) — Translated strength label via `t('users-form.<key>')`; `undefined` when unscored.
- **Template** — A `v-progress-linear` (height 6, rounded, `aria-hidden`) plus a `<p>` with `aria-live="polite"` that carries the human-readable label. The wrapper is gated by `v-if="password.length > 0"` and tagged with `data-test="password-strength-meter"`.

## Relationships
No dependency-graph neighbors are recorded for this file. It imports `usePasswordStrength` from `@/modules/account/composables/use-password-strength.ts`, which supplies the reactive `score`.

## Notes
- The breach/hint warning is intentionally **not** part of this component; a sibling component (driven by `use-password-breach-check.ts`) renders that separately. Do not add it here.
- i18n keys are namespaced under `users-form.` (e.g. `users-form.password-strength-very-weak`), not under a component-local scope.
- Scores 0 and 1 both map to the `error` color; only "fair" shifts to `warning`. The visual gradient is therefore: red → red → yellow → green → green.
- The progress bar is `aria-hidden`; screen-reader users rely solely on the `aria-live` paragraph.
- `usePasswordStrength` receives a `computed` wrapper, so the score recomputes reactively as the parent updates `password`.
