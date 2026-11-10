---
source: tests/support/e2e/resilience.ts
sha256: cd50a87cacfbc4dfa717b02e591c5ac6065f5b3b458fe63ab0f96683b25fd076
signature: 39c7022c860476270b4ad521d114e519dd1fbc4236c936e0b0b33a7a0e94e0fb
generated_at: 2026-11-10T07:33:54.546758+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/resilience.ts

## Purpose

Shared resilience assertions for E2E tests. Provides a pair of checks—no unexpected console output and the page fits its viewport—so that every route (central spec or per-module spec) is held to the same bar without duplicating logic or magic values.

## Key elements

- **`isKnownConsoleNoise(call)`** — Whitelist filter for console output that is known, benign noise (Grafana Faro unreachable-collector error, vue-i18n lazy-load warning). Returns `false` for anything else.
- **`CONSOLE_CAPTURE_KEY`** — Property name (`__resilienceConsoleCalls`) used to store the captured-calls array directly on the app window. Deliberately a plain property, not a `cy.spy()` alias.
- **`visitCapturingConsole(path)`** — Visits a route and, in `onBeforeLoad`, wraps `console.error`/`console.warn` to push each call into a `ConsoleCall[]` array attached to the window, while still calling the originals.
- **`assertNoConsoleNoise()`** — Reads the captured array from the window, filters out known noise, and fails (with the offending calls in the message) if any remain.
- **`assertFitsTheScreen(label)`** — Calls `cy.checkLayout` for desktop viewport with `overflow` and `clipped` checks; `label` appears in failure output.
- **`assertRouteIsHealthy(path, pageAnchor)`** — Composite helper: visits with capture, asserts the anchor exists, asserts no console noise, asserts the page fits the screen.
- **`ConsoleCall`** (interface) — `{ type: 'error' | 'warn'; args: unknown[] }`.

## Relationships

Imported by every resilience spec in the repo:

- `tests/e2e/specs/resilience.cy.ts` (central, cross-module spec)
- `src/modules/cart/tests/e2e/resilience.cy.ts`
- `src/modules/example/tests/e2e/resilience.cy.ts`
- `src/modules/inventory/tests/e2e/resilience.cy.ts`
- `src/modules/orders/tests/e2e/resilience.cy.ts`
- `src/modules/products/tests/e2e/resilience.cy.ts`
- `src/modules/tasks/tests/e2e/resilience.cy.ts`

Each spec calls `assertRouteIsHealthy` (or the individual assertions) for its routes. This file is the single source of the noise filter and the capture mechanism.

## Notes

- **Why a plain window property, not `cy.spy().as()`?** A cold `vite dev` navigation can trigger a dependency-discovery reload that discards the window the spy was registered on. A synchronous array reattached in `onBeforeLoad` has no registration step to lose; worst case it is simply reset to `[]`.
- **Noise-list discipline:** The `isKnownConsoleNoise` list must stay short and every entry justified. An unexplained addition silently widens what the spec ignores.
- **No random/faker data:** The assertions are dataset-agnostic by design; generated data would only make a failure harder to reproduce.
- **`originalError` / `originalWarn` are still called**, so real output still reaches the devtools console during a run.
