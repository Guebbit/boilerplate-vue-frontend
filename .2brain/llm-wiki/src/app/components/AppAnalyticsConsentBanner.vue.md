---
source: src/app/components/AppAnalyticsConsentBanner.vue
sha256: 796cddde8c71b7dad2e493251ac913fe4dadc47f9e01b03d4a038e3cb6929102
generated_at: 2026-10-17T00:04:22.478793+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppAnalyticsConsentBanner.vue

## Purpose

A bottom-pinned consent banner for guest (non-authenticated) users. It appears while the analytics consent state is `unknown` or after the footer "Privacy choices" link re-opens it, and only when an analytics provider (Umami or Faro) is actually configured. Accept and Decline both write to the shared consent store, which the HTTP layer's `onRequest` interceptor later reads to decide whether to attach the `X-Analytics-Consent` header.

## Key elements

- **`consent`** – the Pinia store (`useAnalyticsConsentStore`) read directly (no `storeToRefs`); the template only accesses `consent.promptOpen` for visibility and calls `consent.grant()` / `consent.deny()` on button click.
- **`isAnalyticsConsentEnabled()`** – imported gate function; the banner renders only when this returns true *and* `consent.promptOpen` is true.
- **`v-alert` (tonal, info)** – the visible banner surface; carries `role="region"`, an i18n `aria-label`, and the `data-test="analytics-consent-banner"` hook.
- **Accept / Decline buttons** – both use `variant="tonal"` so neither is visually dominant (CNIL / EDPB taskforce requirement). Wired to `consent.grant()` and `consent.deny()` respectively; tagged `data-test="analytics-consent-accept"` / `-decline`.
- **`t()`** – all user-facing strings resolved through `vue-i18n` under the `analytics-consent.*` key namespace.

## Relationships

No graph neighbors are listed for this file. The only import is `@/infrastructure/analytics-consent.ts`, from which it pulls `useAnalyticsConsentStore` and `isAnalyticsConsentEnabled`.

## Notes

- **Fixed positioning, not in-flow:** the wrapper uses `position-fixed bottom-0` with an opaque `bg-surface` and `z-index: 2000`. A `v-alert` placed in normal flow would slide under the fixed app bar, and the banner must appear wherever the visitor clicked the footer link.
- **Reads store state directly** rather than via `storeToRefs` because `promptOpen` is the only property consumed; the template's reactive access to Pinia state is sufficient.
- **Dual visibility gate:** the `v-if` requires *both* `isAnalyticsConsentEnabled()` and `consent.promptOpen`. If no analytics provider is configured the banner never renders, regardless of consent state.
- **Equal-weight buttons:** Accept and Decline intentionally share the same `variant` and `size` to avoid a dark pattern that would pressure the user toward acceptance.
