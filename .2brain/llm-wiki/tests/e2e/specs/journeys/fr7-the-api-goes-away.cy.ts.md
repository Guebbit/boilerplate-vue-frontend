---
source: tests/e2e/specs/journeys/fr7-the-api-goes-away.cy.ts
sha256: bcb7aca667297e8f402603e505f7afb5a29ec6942c9aab9c7f0cdd46659ad81c
signature: 03723b61fa73f2be641d89014f6face749b7e6b955b925b9749d370b447e5ec2
generated_at: 2026-11-10T07:07:49.831210+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr7-the-api-goes-away.cy.ts

## Purpose

End-to-end Cypress test for Feature Requirement 7: what happens when the API becomes unreachable mid-session. It verifies that the page the visitor is on stays intact, error messages are human-readable sentences (not raw codes), half-typed form data is preserved on failure, the health banner appears only after the browser's `online` event re-triggers the health probe, and the same submit button works again once the API responds. The API failure is faked with `forceNetworkError`; the test never depends on a real backend.

## Key elements

- **`UNREADABLE`** (const) — Regex (`/undefined|\[object|network error|null/i`) used to assert that error toasts and inline messages are not raw codes or broken values.
- **`fireOnline()`** (const arrow function) — Dispatches a synthetic `online` `Event` on the window, which is the signal the app's health probe listens for to re-run its check.
- **`describe('FR7 · The API goes away mid-session')`** — Single test case walking through five `cy.step` phases: catalogue with products visible → API intercept drops requests → health banner appears only after `fireOnline()` → contact form submit fails but retains all typed values and stays re-submittable → newer intercept lets requests through, banner clears, same button submits successfully and clears the form.
- **`cy.intercept(everything, { forceNetworkError: true })`** — The "API goes away" mechanism; a catch-all (`${apiUrl}/**`) intercept that forces a network error on every outbound request.
- **`cy.intercept(everything, (req) => req.continue())`** — Recovery mechanism; a newer intercept that simply lets requests pass through, simulating the API answering again.

## Relationships

The dependency graph reports no neighboring files. The file declares `requires-module: tasks, products` in a comment, indicating it depends on those modules being loaded, but no import or graph edge is present in the source.

## Notes

- **Health banner is reactive, not proactive.** It does *not* appear the moment a request fails. It appears only when the app's health probe re-runs, which is triggered by the browser `online` event (or the startup probe / slow retry timer). The test deliberately fires `online` to avoid waiting on the retry timer.
- **`cy.step` and `cy.textareaIn`** are custom Cypress commands (not in the file); they must be registered elsewhere in the support layer.
- **Intercept ordering matters for recovery.** The recovery step registers a *newer* intercept with the same pattern; Cypress applies the most recently registered matching intercept first, so `request.continue()` overrides the earlier `forceNetworkError` stub.
- **`cy.env(['apiUrl'])`** pulls the base URL from Cypress environment config; the catch-all pattern is built as `` `${apiUrl}/**` ``.
- The test navigates between `/en/products` and `/en/contact` within a single `it` block, relying on `cy.restore()` in `beforeEach` to reset state.
