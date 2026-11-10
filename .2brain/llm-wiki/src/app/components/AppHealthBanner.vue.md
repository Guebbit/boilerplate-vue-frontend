---
source: src/app/components/AppHealthBanner.vue
sha256: 554f91a34ef71bb90c2ea98792ce34f4d7766ee401b8948bc4209efb44f95e68
signature: 6789082399d4d8d3dac31422dc485911a9065f8ede29f5c984e7f4eb0be6e010
generated_at: 2026-11-10T02:49:13.377991+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppHealthBanner.vue

## Purpose

Presentational banner that appears only when the API health endpoint stops responding. It signals a **degraded** state (not a full outage) because the app continues to render from bundled dictionaries and cached pages without a live backend.

## Key elements

- **`useLivenessProbe(() => getHealth())`** — polls the liveness endpoint and exposes a reactive `down` boolean that drives the banner's visibility.
- **`getHealth` (from `@api`)** — the sole caller of `GET /` in the entire app. Deliberately imported here rather than routed through a composable or store.
- **`useI18n()` / `t('generic.api-unreachable')`** — renders the localized "API unreachable" message.
- **`<v-system-bar>`** — Vuetify bar shown when `down` is true; carries `data-test="health-banner"` for e2e selectors.
- **Live-region wrapper** (`role="status" aria-live="polite" aria-atomic="true"`) — always mounted; only its inner content toggles so screen readers announce the change.

## Relationships

No external dependency-graph neighbors are recorded for this file.

## Notes

- The `eslint-disable-next-line @typescript-eslint/no-restricted-imports` on the `getHealth` import is **intentional**: the codebase rule "a component wires, it does not call the API" is waived here because extracting a single-line composable would add a file for no behavioral gain. The comment above the import documents the rationale.
- The live region must stay mounted at all times. If the `<div role="status">` were wrapped in `v-if`, assistive technology would treat the region as new when it appears and would **not** announce the message.
- `aria-atomic="true"` on the wrapper ensures the full message is read as one unit when the content changes.
