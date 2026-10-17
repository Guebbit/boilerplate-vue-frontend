---
source: tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts
sha256: 8ca48f9f71bf66731bca653f11fd5ea2d90e7720d909ec84227c3b7f964d1065
generated_at: 2026-10-17T02:12:05.814765+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts

## Purpose

E2E journey test (CU25) that drives a full purchase — checkout, declined card, retry payment, order cancellation — and asserts Umami receives **exactly one** new analytics row per event (`order_created`, `checkout_completed`, `payment_declined`, `payment_succeeded`, `order_cancelled`). It exists to catch the backend double-emitting an analytics event while still attributing all rows to the server (the frontend emits none of its own).

## Key elements

- **`EVENTS`** — `readonly` tuple of the five expected analytics event names, in story order.
- **`describe` block / single `it`** — the test body. Uses a 60-second "since" timestamp, captures `eventCounts` before and after the journey, and asserts `after − before === 1` for every event.
- **`beforeEach`** — calls `cy.skipUnlessLive()`, restores a clean state, and visits `/en`.
- **Test flow** — enables analytics consent via API, adds a product to cart, checks out with pickup, pays with a declining card then a paying card, cancels the order, then iterates `EVENTS` calling `waitForEvent` (at-least-N) before the final exact-count assertion.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `addToCartFromStorefront`, used to place a product in the cart via the storefront UI.
- **`tests/support/e2e/umami.ts`** — provides `umamiSession` (returns the Umami API session), `eventCounts` (bulk count of events since a timestamp), and `waitForEvent` (polls until a given event's count reaches a target). The test calls all three.

## Notes

- **Live-only:** the demo profile has no Umami instance, so the test self-skips via `cy.skipUnlessLive()`.
- **Delta, not absolute count:** measurements use a `since` window (~60 s before the story starts) so unrelated writes from other suite members are excluded.
- **"At least one" before "exactly one":** `waitForEvent` gates each event before the final `eventCounts` assertion. A count that has "stopped rising" could still be mid-write for a second row; waiting for ≥1 first eliminates that ambiguity.
- **No frontend analytics:** the comment explicitly notes the browser emits none of the five events, so a delta of 2 would be unambiguously a backend double-emit rather than a client-side contribution.
