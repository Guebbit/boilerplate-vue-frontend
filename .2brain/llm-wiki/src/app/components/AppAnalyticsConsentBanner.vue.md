---
source: src/app/components/AppAnalyticsConsentBanner.vue
sha256: 37c78ebf94b20a4771fd7794eb60946a5029908f40c3c5290a7d2f25bc1f3a76
generated_at: 2026-10-02T14:35:47.514567+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppAnalyticsConsentBanner.vue

## Purpose

A guest-facing analytics consent banner pinned to the bottom edge of the viewport. It is shown only when Umami is configured **and** the visitor's consent choice is still `unknown` (or has been reopened via the footer's "Privacy choices" link). Accept or Decline persists the choice through the shared consent store, which the HTTP `onRequest` interceptor later reads to decide whether an anonymous request carries the `X-Analytics-Consent` header.

## Key elements

- **Default SFC export** — no named functions or classes; the entire file is a single `<script setup>` component.
- **`useAnalyticsConsentStore()`** (Pinia) — provides `promptOpen` (gates visibility) and the `grant()` / `deny()` actions called by the two buttons.
- **`isAnalyticsConsentEnabled()`** — imported guard; returns false when Umami is not configured, hiding the banner entirely.
- **`useI18n().t`** — all user-visible strings (`analytics-consent.*` keys) are pulled through vue-i18n.
- **`v-alert` + `v-btn`** (Vuetify) — the visible UI; `data-test` attributes (`analytics-consent-banner`, `…-accept`, `…-decline`) are exposed for E2E selectors.

## Relationships

No dependency-graph neighbors are recorded. The component imports from `@/infrastructure/analytics-consent.ts` (store + feature flag) and is referenced conceptually by the app footer ("Privacy choices" link) and the HTTP interceptor, but those files are not tracked as graph neighbors here.

## Notes

- **Fixed positioning, not in-flow.** The banner uses `position-fixed; bottom-0; z-index: 2000` with an opaque `bg-surface` wrapper. This is deliberate: an in-flow `v-alert` would slide under the fixed app bar, and the banner must appear wherever the visitor clicked the footer link.
- **Direct store access, no `storeToRefs`.** The template reads `consent.promptOpen` reactively on its own; the author notes this is the only property read, so the extra wrapper is unnecessary.
- **`rounded-0` on the alert** removes Vuetify's default corner radius so the banner reads as a full-width bar flush against the viewport edge.
