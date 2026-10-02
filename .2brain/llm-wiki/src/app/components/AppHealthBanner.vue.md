---
source: src/app/components/AppHealthBanner.vue
sha256: 554f91a34ef71bb90c2ea98792ce34f4d7766ee401b8948bc4209efb44f95e68
generated_at: 2026-10-02T11:42:44.457399+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppHealthBanner.vue

## Purpose

A thin, always-mounted banner that probes the API's liveness endpoint (`GET /`) and conditionally renders a warning bar when the backend is unreachable. It communicates a *degraded* state (not a hard error) because the app still serves cached pages and bundled dictionaries without the API.

## Key elements

- **`down`** — reactive boolean from `useLivenessProbe(() => getHealth())`. Drives the `v-if` on the banner; `true` means the last health check failed.
- **`getHealth`** (imported from `@api`) — the sole caller of the root health endpoint in the entire application.
- **`useLivenessProbe`** (from `@guebbit/vue-toolkit`) — wraps the probe call and exposes the `down` flag.
- **`t('generic.api-unreachable')`** — i18n key for the user-facing message.
- **`v-system-bar` with `data-test="health-banner"`** — the visible UI element (Vuetify system bar, warning color, centered, with a `CloudOff` icon).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **`aria-live` pattern is intentional.** The `role="status"` wrapper div is *always* in the DOM; only its child content appears/disappears. Screen readers only announce changes inside a region they already knew about, so creating the region together with the message would silence the announcement.
- **Restricted-import exception.** `getHealth` is imported directly here despite an `@typescript-eslint/no-restricted-imports` rule, with an inline `eslint-disable` and a justification comment. The file is the single consumer of that endpoint; extracting a composable/store would add a file for one call.
- **Not an error page.** By design this is a soft "API unreachable" nudge, not a full-screen failure state. The rest of the app continues to render.
- **Icon is `aria-hidden`.** The textual message carries the meaning; the `CloudOff` glyph is decorative.
