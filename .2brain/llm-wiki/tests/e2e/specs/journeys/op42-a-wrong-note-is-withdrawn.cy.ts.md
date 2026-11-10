---
source: tests/e2e/specs/journeys/op42-a-wrong-note-is-withdrawn.cy.ts
sha256: 713df7c1169e6c3ceef4cfaa8edbdefb39aef173b9f79937e20f3013997a097f
signature: 5489d62abfa8198839481d15276f483710eaa36021e368cbabc7c44086b1f8d8
generated_at: 2026-11-10T07:19:14.036520+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op42-a-wrong-note-is-withdrawn.cy.ts

## Purpose

E2E journey test for OP42: verifies that a staff-written order note is invisible to the buyer (page and API), and that withdrawing the note's text leaves the timeline row in place but strips its text and the remove button — all while the buyer's view remains clean.

## Key elements

- **`NOTE`** – The string the admin types; asserted absent from the buyer's page and API throughout.
- **`EntryLike`** – Minimal `{ type, text? }` shape used to read timeline API responses in assertions.
- **`NOTE_ROW`** – CSS selector (`[data-test=order-timeline-entry][data-type=note_added]`) targeting the staff-only note row in the DOM.
- **`describe('OP42 · A wrong note is withdrawn')`** – Suite entry point. `beforeEach` visits `/en`, restores a clean DB snapshot, and revisits.
- **Single `it` block** – Runs the full five-step journey: write note → buyer sees nothing (DOM + API) → admin removes text → API confirms row persists without `text` → buyer still sees no row.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Requires the `account` and `orders` feature modules to be available (per the `requires-module` comment).
- Uses project-level Cypress custom commands: `cy.restore()`, `cy.subjectId()`, `cy.loginAs()`, `cy.switchUser()`, `cy.step()`, `cy.apiAs()` — these are not part of the standard Cypress API.
- The test asserts the note row **still exists** after text removal (length 1) but that both `[data-test=order-timeline-text]` and `[data-test=order-timeline-note-remove]` are absent from it. This distinguishes "row deleted" from "row emptied."
- API assertions for the buyer check that no entry has `type === 'note_added'` at all; for the admin post-removal, the entry is present but must not carry a `text` property.
