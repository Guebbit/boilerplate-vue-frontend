---
source: src/modules/orders/tests/timeline-domain.spec.ts
sha256: 96148b07637c74bc472752c2d1f3fba088f042844d3a94704a171e80b1180b66
generated_at: 2026-10-17T01:19:39.069840+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/timeline-domain.spec.ts

## Purpose

Vitest suite covering the pure domain logic of the order timeline: how each `OrderTimelineType` renders into a title/detail line via `describeTimelineEntry`, which types are restricted to staff via `isStaffOnly`, how export refusals are classified via `exportRefusalOf`, and that both locale dictionaries name every type. It exists to pin the *structure* of the output (key names, argument order, separator placement) without depending on real i18n wording.

## Key elements

- **`tools` (const)** — A fake `TimelineTools` implementation. `t` echoes `key(params)`; `has` returns `false` for any key containing `"unknown"` (simulating a dictionary miss); `money` and `date` are simple string formatters. All assertions compare against these echoed values, so they verify *which* key is called and *with what args*, not the rendered sentence.
- **`describe('describeTimelineEntry')`** — Per-type tests: `processing` (title only, no data), `paid` (method label), `refund_settled` (amount · reason), `refund_failed` (adds `failureReason`), `fulfillment_held` (unknown code passes through), `status_overridden` (from→to), `delivered` (withdraw deadline date), `shipment_shipped` (parcel number + optional tracking code), `invoice_issued` (document number).
- **`describe('the preorder rows')`** — Tests `release_date_moved` (from/to with `null` → `date-none`), `delay_notice_sent` (expected date + needs-answer flag), and `wait_confirmed` / `wait_expired` (title only, no detail).
- **`describe('isStaffOnly')`** — Enumerates all `OrderTimelineType` values and asserts exactly four are staff-only: `fulfillment_held`, `fulfillment_released`, `refund_failed`, `status_overridden`.
- **`describe('timeline dictionaries')`** — Parameterised over `en.json` / `it.json`: every `OrderTimelineType` must have a `type-{type}` key in both dictionaries, and the Italian `type-paid` string must differ from the English one.
- **`describe('exportRefusalOf')`** — 429 → `'rate-limited'`; 422 + `ORDER_EXPORT_TOO_LARGE` → `'too-large'`; 422 with other codes, 500, and `undefined` → `undefined` (falls through to generic handling).

## Relationships

- **`src/modules/orders/domain/index.ts`** — Re-export barrel; the test imports `describeTimelineEntry`, `isStaffOnly`, `exportRefusalOf`, and the `TimelineTools` type from here.
- **`src/modules/orders/domain/timeline.ts`** — Implements `describeTimelineEntry` and `isStaffOnly`; the test exercises every public type and the staff-visibility set defined there.
- **`src/modules/orders/domain/export-refusal.ts`** — Implements `exportRefusalOf`; the test pins the status/code → reason-string mapping.
- **`@api` (`OrderTimelineType`)** — Single source of truth for the set of timeline types; both the staff-only enumeration and the dictionary-completeness check derive from it.
- **`src/modules/orders/locales/en.json` / `it.json`** — Locale dictionaries the dictionary tests read directly to verify key coverage.

## Notes

- Assertions compare against the *fake* tool output (e.g. `'order-timeline.type-processing'`), not real i18n strings. If the fake's echo format changes, every expected literal in this file changes too.
- The `has` fake treats any key containing the substring `"unknown"` as missing. This is what makes the `fulfillment_held` / unknown-code test work; it is not a real locale lookup.
- `it.each` is used only for the two-locale dictionary check; all other tests are individual `it` blocks.
- The `isStaffOnly` test sorts with `.toSorted()` (ES2023) rather than `.sort()` to avoid mutating the array.
