---
source: src/app/components/AppStaffEnrollmentBanner.vue
sha256: 8d1e012c4086549933c6a55a4a09375010bf3cc6f5e5b9e5de0c93e053bca15b
signature: 849de8c13f65d54ab34e9f95ee4fe792756df611c2dea0f9dc028c156a84c61a
generated_at: 2026-11-10T02:51:12.489493+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppStaffEnrollmentBanner.vue

## Purpose

A shell-level Vuetify `v-alert` banner that appears on **every** page when a signed-in staff user still needs to enroll an authenticator app. It exists because a staff role grants no menu access until an app is armed, so the user would otherwise see a silently missing staff menu with no explanation. The banner explains *why* and links to the Profile page to fix it.

## Key elements

- **Named component block (`<script lang="ts">`)** – Declares `name: 'AppStaffEnrollmentBanner'` so the SFC has a stable identifier for DevTools and `<KeepAlive>`; required because `<script setup>` cannot set a component name.
- **`viewer` / `secondFactorRequired` (from `useSessionStore`)** – Reactive refs pulled via `storeToRefs`. `viewer` is the authenticated user; `secondFactorRequired` is the server-provided flag from `GET /account`'s `abilities`. Both gate the banner's visibility.
- **`v-alert` (template root)** – Rendered only when `viewer && secondFactorRequired` are truthy. Uses `type="warning"`, `variant="tonal"`, `density="compact"`. Carries `data-test="staff-enrollment-banner"` for E2E selectors.
- **`v-btn` in `#append` slot** – Small text-variant button labelled via `t('staff-enrollment-banner.button')`. Navigates to the `Profile` route through `routerLinkI18n({ name: 'Profile' })` wrapped in `RouterLink`. Carries `data-test="staff-enrollment-go"`.
- **`useI18n()`** – Provides the `t()` translator for the banner's own copy keys (`staff-enrollment-banner.message`, `staff-enrollment-banner.button`).

## Relationships

No graph neighbors are registered for this file. It is a leaf component that consumes the session store, the i18n router-link helper, and Vuetify/Vue-Router primitives, but is not depended upon by any other tracked module in the dependency graph.

## Notes

- **Server-driven visibility, not role-name checks.** The banner keys exclusively on `secondFactorRequired` returned by the API. Adding or renaming a staff role requires no change to this component.
- **Mounted in the app shell.** Because it lives at the layout/shell level (not inside a routed view), it rides every page without per-route opt-in.
- **Dual `<script>` + `<script setup>` pattern.** The plain `<script>` block exists *solely* to set the component `name`; all logic lives in `<script setup>`.
- **`routerLinkI18n`** wraps the route config so the link target respects the active locale path, rather than hard-coding a static path.
