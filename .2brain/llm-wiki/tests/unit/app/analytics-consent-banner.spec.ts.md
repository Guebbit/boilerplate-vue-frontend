---
source: tests/unit/app/analytics-consent-banner.spec.ts
sha256: dfecc8e98838f5bb2f8273fbc5c29db743548d47c467e752e25e606cd7fdcc4b
signature: 67c3faacce66d82f0192e51324aca31574453ccd7fad36e4d26224e56dcf2a3d
generated_at: 2026-11-10T07:43:56.816449+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/analytics-consent-banner.spec.ts

## Purpose

Unit tests for the `AppAnalyticsConsentBanner` Vue component, verifying its visibility logic (hidden when Umami is unconfigured, visible while the guest's choice is `unknown`, hidden after a decision), the conditional wording (crash-report vs. usage-statistics copy depending on which backends are configured), and the Accept/Decline button behaviour and visual parity.

## Key elements

- **`mountBanner()`** — Mounts the component with a real Pinia instance and the project Vuetify plugin.
- **`vi.mock('@/infrastructure/analytics-consent.ts')`** — Replaces the consent Pinia store with a plain object whose `choice` and `promptOpen` are getters reading from module-scoped mutable objects (`consentChoice`, `promptOpen`), and `grant`/`deny` are `vi.fn()` spies. Also mocks `isAnalyticsConsentEnabled` to return the mutable `flagEnabled`.
- **`vi.mock('@/infrastructure/observability/config.ts')`** — Mocks `readFaroConfig` and `readUmamiConfig` so tests can toggle whether a Faro receiver or Umami site-id is "configured".
- **`vi.mock('vue-i18n')`** — Wraps the real module but overrides `useI18n` so `t(key)` simply returns the key string, letting tests assert on i18n keys directly.
- **`beforeEach`** — Resets all mutable state variables and clears the `grant`/`deny` spies before each test.
- **`describe('AppAnalyticsConsentBanner')`** — Eleven tests covering: no-render when disabled; Faro-only wording; Umami-only wording; no Faro wording; visibility for `unknown` choice; re-open after answered; hidden after grant; hidden after deny; Accept → `grant()`; Decline → `deny()`; visual parity between the two buttons (both `v-btn--variant-tonal`, no `bg-primary`).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- State manipulation is done via plain module-scoped variables (`flagEnabled`, `faroConfigured`, `umamiConfigured`, `consentChoice.value`, `promptOpen.value`) rather than reactive refs; the mocked getters read them on access. This means the component sees the current value at render time, but no reactivity is exercised.
- Because the i18n mock returns keys verbatim, test assertions check for literal strings like `analytics-consent.crash-reports` — not translated copy.
- The "Decline gets the same weight" test is a design/UX assertion (equal visual treatment, `v-btn--variant-tonal` on both, no primary color) enforced at the test level rather than in a shared style constant.
