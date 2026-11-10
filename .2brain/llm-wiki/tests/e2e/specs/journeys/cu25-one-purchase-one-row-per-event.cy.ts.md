---
source: tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts
sha256: 9dca8f4b99e91cb8d3afe3db0e774b0770529a5b39aaa502ecc6796664584b72
signature: e02d4bb269c97e97b5e196533dc876512bf82ca9536f224c2d1925b73593f775
generated_at: 2026-11-10T06:58:01.976984+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu25-one-purchase-one-row-per-event.cy.ts

## Purpose

E2E test (CU25) that verifies a single purchase journey—declined card, successful retry, then order cancellation—produces **exactly one** Umami analytics row per backend event (`order_created`, `checkout_completed`, `payment_declined`, `payment_succeeded`, `order_canceled`). It exists to catch the backend double-emitting or silently dropping analytics events.

## Key elements

- **`EVENTS`** – `as const` array of the five expected event names, in story order.
- **`describe('CU25 …')`** – Top-level suite. `beforeEach` skips unless live (`cy.skipUnlessLive()`), visits `/en`, restores state, and re-visits.
- **`it('records each step … exactly once')`** – Drives the full journey (consent → add to cart → checkout → decline → pay → cancel), then asserts a delta of exactly 1 per event by comparing `eventCounts` before and after, gated by `waitForEvent`.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `addToCartFromStorefront`, used to add a product to the cart from the storefront.
- **`tests/support/e2e/umami.ts`** – Provides `umamiSession` (obtains the Umami session/cookie), `eventCounts` (queries row counts per event name since a timestamp), and `waitForEvent` (polls until a given event's count reaches an expected value).

## Notes

- **Live-only.** The demo profile has no Umami instance behind it, so the test self-skips in non-live environments.
- **Delta-based measurement.** Counts are taken relative to a `since` timestamp (60 s before the test) to isolate this story's rows from other suite activity.
- **"At least one" before "exactly one."** The test first calls `waitForEvent` for each name (poll until ≥ expected), *then* asserts the delta equals 1. Simply waiting for the count to stop rising cannot distinguish a genuine single write from a delayed second write.
- **`pickup` shipping method** is chosen so no address form is needed, keeping the checkout path short.
- The frontend itself emits no Umami events; all five are written by the backend, which is why the test can reason about backend duplication vs. browser-side noise.
