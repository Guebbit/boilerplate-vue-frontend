---
source: tests/unit/app/analytics-consent-banner.spec.ts
sha256: f7eddfce9348aa9dddeb772e04e9c02d791319484e786178207e8c4a4589b1c5
generated_at: 2026-10-17T02:29:39.110780+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/analytics-consent-banner.spec.ts

## Purpose

Unit test for the `AppAnalyticsConsentBanner` component. Verifies the three visibility states (hidden when Umami is unconfigured, visible while the guest's choice is `unknown`, hidden after a button press) and confirms that the Accept/Decline buttons call the correct store actions without visual bias toward one option.

## Key elements

- **`mountBanner`** — Helper that mounts `AppAnalyticsConsentBanner` with a fresh Pinia instance and the shared Vuetify config.
- **`vi.mock('@/infrastructure/analytics-consent.ts')`** — Replaces the real consent store and `isAnalyticsConsentEnabled` with mutable objects (`consentChoice`, `promptOpen`, `flagEnabled`) and `vi.fn()` stubs for `grant`/`deny`.
- **`vi.mock('vue-i18n')`** — Keeps the real i18n module but swaps `useI18n` so `t(key)` returns the key itself, avoiding locale setup in tests.
- **`beforeEach`** — Resets `flagEnabled`, `consentChoice`, `promptOpen`, and both stubs to their defaults before every test.
- **Eight `it` blocks** covering: flag-off hides regardless of choice; choice-unknown shows; reopened-after-answer shows; granted/denied with `promptOpen=false` hides; Accept → `grant()` called once, `deny()` not; Decline → `deny()` called once, `grant()` not; Decline and Accept share identical Vuetify variant classes and neither carries `bg-primary`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `promptOpen` and `consentChoice` values live in a plain `let`/object at module scope (not inside the `vi.mock` factory closure), so each test mutates them directly. This works because the factory returns getters that read those variables on access.
- The "reopened" test (`consentChoice = 'granted'`, `promptOpen = true`) asserts the banner re-appears even for an already-answered visitor — a deliberate product decision encoded as a test case.
- Button-parity check compares Vuetify variant classes (`v-btn--variant-*`) and background utilities (`bg-*`) to enforce that neither option is visually privileged.
- Click tests return the promise from `.trigger('click').then(…)` rather than using `await`; Vitest treats the returned promise as the assertion scope.
