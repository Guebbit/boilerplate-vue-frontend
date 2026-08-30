# src/app/components/AppHealthBanner.vue

## Purpose

A thin, always-mounted presentational banner that surfaces a "degraded" warning when the API backend is unreachable. It intentionally does not render an error page—the app remains functional with bundled dictionaries and cached pages, so the message is "offline" rather than "broken." The component only reads a reachability flag; it never calls the API itself.

## Key elements

- **`down` (from `useApiHealth()`)** — reactive boolean; when `true`, the inner `v-system-bar` renders, when `false` it is removed.
- **`t('generic.api-unreachable')`** — i18n translation string displayed inside the banner.
- **`CloudOff` icon (lucide-vue-next)** — decorative, marked `aria-hidden="true"` so screen readers skip it.
- **`role="status" aria-live="polite" aria-atomic="true"` wrapper** — the stable live region that *stays mounted* regardless of `down`. Only its content (the `v-if` child) comes and goes.
- **`data-test="health-banner"`** — stable selector for e2e / integration tests.

## Relationships

- **`src/infrastructure/composables/use-api-health.ts`** — imported as `useApiHealth`; the component destructures `{ down }` from it. All probing/HTTP logic lives in that composable; this file is purely a view of its single reactive flag.

## Notes

- **Accessibility gotcha (the whole point of the wrapper):** A live region that is *created* together with its message is never announced by assistive technology. The `div[role="status"]` must remain in the DOM at all times; only the `v-system-bar` inside it toggles. Do not move the `v-if` up to the wrapper.
- **Not an error page by design.** The banner is `color="warning"` (Vuet system-bar), not `error`. Treat any refactor that changes it to a full-page block as a behavior change.
- The component has no props, emits no events, and exposes no state—its entire contract is "render when `down` is true."
