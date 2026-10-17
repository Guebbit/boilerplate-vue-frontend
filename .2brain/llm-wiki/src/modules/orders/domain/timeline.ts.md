---
source: src/modules/orders/domain/timeline.ts
sha256: 5f7ec4c90534a5cb1914237a41d3477722eb968fae303f6ec04ee72cbd63571a
generated_at: 2026-10-17T01:15:38.838714+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/timeline.ts

## Purpose

Pure domain logic that turns a raw `OrderTimelineEntry` (type + free-form `data`) into a displayable title and optional detail string, and declares which timeline types are staff-only. All formatting dependencies (translation, money, dates) are injected via the `TimelineTools` interface so the same code powers both the Vue component and plain unit tests without pulling in Vue or i18n.

## Key elements

- **`TimelineAudience`** — Union type `'buyer' | 'staff'` indicating who sees a row.
- **`TIMELINE_AUDIENCE`** — `Readonly<Record<OrderTimelineType, TimelineAudience>>`; the single source of truth for audience, compiler-checked against the contract's `OrderTimelineType`.
- **`isStaffOnly(type)`** — Convenience predicate: returns `true` when the audience is `'staff'`.
- **`TimelineTools`** — Injected helper interface: `t`, `has`, `money`, `date`. Keeps the module free of runtime framework dependencies.
- **`TimelineLine`** — Output shape: `{ title: string; detail?: string }`.
- **`describeTimelineEntry(entry, tools)`** — Main entry point. Looks up the type's detail builder in `DETAILS`, collects non-undefined fragments, joins them with `' · '`, and returns the `TimelineLine`.
- **`DETAILS`** (internal) — `Partial<Record<OrderTimelineType, DetailBuilder>>`; maps each type that *has* a detail to its builder function. Types absent here render title-only.
- **Detail builders** (internal): `statusMove`, `refundParts`, `returnReason`, `documentNumber`, `dateMove`, `delayNotice`, plus inline lambdas for `paid`, `delivered`, `cancelled`, `refund_failed`, `shipment_shipped`, `shipment_delivered`, `fulfillment_held`.
- **Fragment helpers** (internal): `textOf`, `codeLabel`, `coded`, `amountOf`, `plain` — small utilities for reading `data` fields and producing `'Label: value'` strings.

## Relationships

- **`src/modules/orders/components/OrderTimeline.vue`** — Consumes `describeTimelineEntry`, `TIMELINE_AUDIENCE`, and `isStaffOnly` to render timeline rows and flag staff-only entries in the UI.
- **`src/modules/orders/domain/index.ts`** — Barrel file; re-exports this module's public API (`describeTimelineEntry`, `TIMELINE_AUDIENCE`, `isStaffOnly`, and the public types) for the rest of the orders domain.
- **`src/modules/orders/tests/timeline-domain.spec.ts`** — Unit-tests `describeTimelineEntry` and `isStaffOnly` with mock `TimelineTools`, exercising each type's title, detail fragments, and audience logic.

## Notes

- **Compile-time exhaustiveness:** Adding a new member to `OrderTimelineType` in `@types` causes a type error until both `TIMELINE_AUDIENCE` and (if it carries detail) `DETAILS` include a row for it. No new entry can silently be missed.
- **`codeLabel` fallback:** When a code from `data` has no matching i18n key (e.g., a payment method added by a newer API), the raw code string is shown rather than a blank — readability over perfection.
- **Detail fragments are optional:** Each builder returns an array of `string | undefined`; `describeTimelineEntry` filters out the undefineds. A type whose builder returns all-undefined yields a title-only line.
- **`data` is untyped** (`Readonly<Record<string, unknown>>`); all field access goes through the small helpers (`textOf`, `amountOf`) to avoid runtime surprises from the free-form API payload.
