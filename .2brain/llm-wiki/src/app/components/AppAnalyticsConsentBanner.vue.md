---
source: src/app/components/AppAnalyticsConsentBanner.vue
sha256: 5b6fd704450f765927ecfe661bf70fc0056db81998dc44029ebe56e2cb03da5c
signature: afceba5e31917c4127fa15dcc2bbac36c871019aa8e2961e894af7d00b2ac1c8
generated_at: 2026-11-10T02:49:05.987052+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppAnalyticsConsentBanner.vue

## Purpose

A fixed-bottom consent banner that asks visitors to accept or decline analytics tracking (Umami usage statistics, Faro crash reports and page-speed data). It is shown only while the consent choice is still `unknown` (or reopened via the footer "privacy choices" link) and only when at least one analytics backend is configured.

## Key elements

- **`consent`** — the Pinia store (`useAnalyticsConsentStore`) read directly (not via `storeToRefs`). Exposes `promptOpen` (visibility gate) and the `grant()` / `deny()` actions that persist the choice.
- **`isAnalyticsConsentEnabled()`** — imported guard that returns false when neither Umami nor Faro is configured; the banner renders nothing.
- **`readUmamiConfig()` / `readFaroConfig()`** — imported config readers; each is called in the template to decide whether the corresponding purpose-specific sentence is shown.
- **Template root `<div>`** — `fixed inset-x-0 bottom-0 z-banner` wrapper with an opaque surface so the tonal `v-alert` stays readable over scrolled content. Rendered only when `isAnalyticsConsentEnabled() && consent.promptOpen`.
- **`v-alert`** — carries `role="region"`, an `aria-label` from i18n, and `data-test="analytics-consent-banner"` for e2e selectors.
- **Accept / Decline buttons** — both use `variant="tonal" size="small"` for equal visual weight (CNIL / EDPB guidance); wired to `consent.grant()` and `consent.deny()` respectively.

## Relationships

No graph neighbors are listed. The component's runtime dependencies (`useAnalyticsConsentStore`, `isAnalyticsConsentEnabled`, `readUmamiConfig`, `readFaroConfig`, `useI18n`) are consumed via imports but are not tracked as graph edges here.

## Notes

- The banner is **fixed-positioned**, not in normal page flow, specifically so it can be re-opened from the footer "privacy choices" link regardless of scroll position and so it isn't hidden behind the fixed app bar.
- The store property is accessed directly in the template rather than through `storeToRefs`; the comment notes that a single reactive read is sufficient here.
- Accept and Decline are intentionally styled identically (same `variant`, `size`) to satisfy regulatory guidance that a refusal must not be visually subordinate to acceptance.
- Purpose-specific sentences are conditionally rendered: the Umami sentence appears only when an Umami config exists, the Faro sentence only when a Faro config exists. This prevents listing purposes for backends that won't actually receive data.
