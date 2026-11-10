---
source: src/modules/orders/tests/timeline-domain.spec.ts
sha256: da128ed19568036d3a5971f3018e9a48b9286976f1ace2ebe8e5ee4f66d4aa96
signature: e07ef85ff7f17f3a301d94c220be7aa2b08b4b09cc039cf6f387c20ade0fed1b
generated_at: 2026-11-10T05:05:42.945836+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/timeline-domain.spec.ts

## Purpose

Unit tests for the pure (UI-agnostic) half of the order timeline: verifying that `describeTimelineEntry` produces the correct translation-key structure for every entry type and that `exportRefusalOf` maps API error responses to the expected refusal reasons. Assertions check *which* keys and values are emitted, not the rendered wording, by injecting a fake `TimelineTools` that echoes its arguments.

## Key elements

- **`tools` (const)** — A `TimelineTools` implementation whose `t`, `money`, `day`, `utcDate` simply concatenate their arguments, so expected strings are deterministic key paths.
- **`row` (const)** — Minimal timeline-row fixture (`id`, `at`, `audience`) spread into every case.
- **`allTypes` (const)** — Extracted from the generated `GetOrderTimelineResponse` schema variants; drives the dictionary-completeness check.
- **`describe('describeTimelineEntry')`** — One `it` per entry type (shipment_lost, canceled, processing, paid, refund_settled/failed/canceled, dispute_opened, fulfillment_held, status_overridden, delivered, shipment_shipped, invoice_issued, release_date_moved, delay_notice_sent). Each asserts the exact `title`/`detail` key-path string.
- **`describe('timeline dictionaries')`** — Parameterised over `en.json` and `it.json`; asserts every type in `allTypes` has a `type-<name>` key and that the two locales differ.
- **`describe('exportRefusalOf')`** — Asserts 429 → `'rate-limited'`, 422 + `ORDER_EXPORT_TOO_LARGE` → `'too-large'`, everything else → `undefined`.

## Relationships

- **`src/modules/orders/domain/index.ts`** — Barrel file; the test imports `describeTimelineEntry`, `exportRefusalOf`, and the `TimelineTools` type through it.
- **`src/modules/orders/domain/timeline.ts`** — Source of `describeTimelineEntry` and the `TimelineTools` contract under test.
- **`src/modules/orders/domain/export-refusal.ts`** — Source of `exportRefusalOf`, tested for its status/code → reason mapping.

## Notes

- The `tools.has` stub returns `false` for any key containing `"unknown"`, simulating a dictionary that lacks a translation; individual tests override it (e.g. the `cause-erasure` case) to verify the "fall back silently" path.
- `allTypes` is read off the **generated API schema** at test time, so adding a new timeline variant to the contract will automatically surface a missing dictionary entry — no manual list to update here.
- Locale files (`en.json`, `it.json`) are imported directly (not through the domain barrel), making the dictionary tests a cross-module check on the locale assets themselves.
