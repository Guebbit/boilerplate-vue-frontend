---
source: src/ui/vuetify/breakpoints.ts
sha256: 9ff9a39ad5cc4d7d106185de63d46972d1b89dd88ef9ad7994069c7dc0b1cd78
signature: 762670d1060fd0ded12c4cb7802b3a0dbee547e08f04ecffc68b25e96f4c4d16
generated_at: 2026-11-10T06:33:39.215399+00:00
model: ollama:qwen3.8:27b
---

# src/ui/vuetify/breakpoints.ts

## Purpose

Single source of truth for Vuetify's display configuration. Defines breakpoint thresholds and the mobile/desktop split so that Vuetify's `useDisplay()`, `VRow`/`VCol` sizing, and Tailwind utility classes (`sm:`, `md:`, `lg:`) all agree on the same pixel boundaries.

## Key elements

- **`BREAKPOINTS`** — `as const` object mapping `xs`→0, `sm`→600, `md`→960, `lg`→1280, `xl`→1920, `xxl`→2560 (CSS px). These override Vuetify's defaults to match Tailwind's scale in `src/styles/main.css`.
- **`MOBILE_BREAKPOINT`** — Set to `'sm'` (600 px). Below this edge Vuetify reports `useDisplay().mobile === true`. Deliberately lowered from Vuetify's default of `lg` so tablets and small laptops are not treated as phones.
- **`display`** — `as const` object (`{ mobileBreakpoint, thresholds }`) shaped to be passed directly into the `display` option of `createVuetify`.

## Relationships

- **`src/ui/vuetify/index.ts`** — Imports `display` and feeds it into the `createVuetify` options at app bootstrap.
- **`tests/support/e2e/a11y-sweep.ts`** / **`tests/support/e2e/sweep-state.ts`** — Import `BREAKPOINTS` to pick one viewport width per band during accessibility and regression sweeps, ensuring each breakpoint band is exercised.

## Notes

- The thresholds intentionally mirror Tailwind's (`src/styles/main.css`). If you change one, change the other — they are not auto-synced.
- The rationale for each band size is documented in `docs/theory/design-system.md`.
- `scripts/e2e/viewports.ts` (the layout matrix) assumes one test viewport per band; adding or removing a band here requires updating that script.
