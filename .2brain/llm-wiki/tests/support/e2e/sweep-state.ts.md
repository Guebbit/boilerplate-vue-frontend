---
source: tests/support/e2e/sweep-state.ts
sha256: ceaaa8b06adc5e1550c43572dd6a6eddef1f3cbd35fbc6297d641299686d60ee
signature: 9ffff09dc4ea9be59060f241249f7f6838a670b8ece709e4d8c767f8b4bb4c3c
generated_at: 2026-11-10T07:36:29.376597+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/sweep-state.ts

## Purpose

Shared "reach-the-state-under-audit" logic for every e2e sweep (a11y, layout, visual, design capture). Centralises route resolution, viewport application, network settling, dark-theme switching, and the optional `prepare` step so each sweep spec does not duplicate the sequence.

## Key elements

- **`SweepRoute`** (type) — A literal path string *or* a zero-arg function returning `Cypress.Chainable<string>`, for routes that must be looked up at runtime.
- **`SweepState`** (interface) — Describes one sweep case: `route`, optional `prepare()`, optional `theme: 'dark'`, optional `viewport: ViewportName`.
- **`resolveRoute`** (exported fn) — Unwraps a `SweepRoute` into a `Cypress.Chainable<string>`; strings are wrapped silently, functions are invoked.
- **`switchToDarkTheme`** (exported fn) — Clicks the theme toggle the way a user would, handling the sub-`sm` case where the toggle lives inside the drawer (opens drawer → clicks → Escape → asserts drawer closed). Then waits for `.v-application.v-theme--dark` to confirm Vuetify applied it.
- **`reachState`** (exported fn) — The main entry point. Applies viewport, starts network tracking, visits the resolved route, waits for `h1` + network settle + no `.v-btn--loading` / `.v-data-table--loading`, then optionally switches theme and runs `prepare`.

## Relationships

- **`src/ui/vuetify/breakpoints.ts`** — Imports `BREAKPOINTS` to check whether the current window width falls below the small breakpoint, determining whether the theme toggle is in the app bar or the drawer.
- **`scripts/e2e/viewports.ts`** — Imports the `ViewportName` type to type the viewport field in `SweepState`.
- **`tests/support/e2e/apply-viewport.ts`** — Imports and calls `applyViewport` before `cy.visit` inside `reachState`, so the page lays out at the target size from its first render.
- **`tests/support/e2e/a11y-sweep.ts`**, **`tests/e2e/specs/layout-checks.cy.ts`**, **`tests/support/e2e/visual-sweep.ts`** — Consumers that build a `SweepState` and call `reachState` as their common setup step.

## Notes

- **Viewport before visit.** `applyViewport` runs *before* `cy.visit` so the initial layout is already at the target size; reflowing after visit would invalidate visual and layout assertions.
- **Network tracking before visit.** `cy.trackNetwork()` is called prior to `resolveRoute` → `cy.visit` so the page's very first fetch is counted by the later `cy.settleNetwork()` call.
- **Loading-state selectors are deliberately narrow.** The code waits on `.v-btn--loading` and `.v-data-table--loading` specifically. It does *not* wait on `.v-progress-circular` because the app shell mounts one permanently (hidden via CSS), which would cause an infinite wait.
- **Two-phase content wait.** `h1` confirms the shell rendered; the loading-class checks confirm the data panels below the heading finished fetching. Neither alone is sufficient — the loading classes pass trivially before the first fetch, and `h1` exists even on an empty data page.
- **Theme toggle is `data-test`-based, not `data-cy`.** This is intentional so the Italian-locale sweep (which may use different labels) can still locate the control.
