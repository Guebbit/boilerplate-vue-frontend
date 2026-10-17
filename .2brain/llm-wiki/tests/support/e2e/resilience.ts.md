---
source: tests/support/e2e/resilience.ts
sha256: ed1b58b73074bf1183573c9e00ba52d502cbee1b0dfd8dfa7406a22900bf1f7b
generated_at: 2026-10-17T02:26:25.341184+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/resilience.ts

## Purpose

Shared resilience assertions for Cypress e2e specs. It provides a fixed pair of checks—no unexpected console output, no horizontal overflow—so that every route in the app (central spec or per-module) is held to the same bar without each spec re-declaring the rules or hard-coding magic values.

## Key elements

- **`visitCapturingConsole(path)`** — Visits a route while monkey-patching `console.error`/`console.warn` to push calls into an array stored on `win.__resilienceConsoleCalls`. Original console methods are still invoked, so output is not suppressed.
- **`assertNoConsoleNoise()`** — Reads the captured array and asserts that no call survives the `isKnownConsoleNoise` filter.
- **`assertNoHorizontalOverflow()`** — Asserts `document.body.scrollWidth ≤ documentElement.clientWidth + 1`.
- **`assertRouteIsHealthy(path, pageAnchor)`** — Composite helper: visit → wait for anchor → console check → overflow check. The intended one-liner for most specs.
- **`isKnownConsoleNoise(call)`** *(internal)* — Returns `true` for Grafana Faro's unreachable-collector error and vue-i18n lazy-load key-missing warnings.
- **`MAX_HORIZONTAL_OVERFLOW_PX`** *(internal const)* — 1 px tolerance to absorb sub-pixel layout rounding.
- **`CONSOLE_CAPTURE_KEY`** *(internal const)* — The property name (`__resilienceConsoleCalls`) used to attach the capture array to the app window.

## Relationships

- **`tests/e2e/specs/resilience.cy.ts`** — The central spec that imports `assertRouteIsHealthy` (or the individual assertions) to walk a set of core routes.
- **`src/modules/cart/tests/e2e/resilience.cy.ts`** — Cart-module spec; imports the same shared assertions to check cart routes.
- **`src/modules/orders/tests/e2e/resilience.cy.ts`** — Orders-module spec; same pattern.
- **`src/modules/products/tests/e2e/resilience.cy.ts`** — Products-module spec; same pattern.

All four consumers rely on this file so they never define their own console-noise list or overflow threshold.

## Notes

- **Why a plain property instead of `cy.spy()`?** The first navigation against a cold Vite dev server can trigger a dependency-discovery full reload, which discards the `Window` the spy was bound to. A plain property re-assigned synchronously in `onBeforeLoad` cannot be silently lost.
- **Noise list is intentionally tiny.** Every entry is documented in the source comment. An unexplained addition is a code smell: it means a real regression is being masked.
- **No random/fixture data.** The two assertions are dataset-agnostic by design; generating data would make a failure harder to reproduce.
- **`pageAnchor` is required** in `assertRouteIsHealthy` to guarantee the page actually rendered before the console/overflow checks run, avoiding false positives from mid-navigation state.
