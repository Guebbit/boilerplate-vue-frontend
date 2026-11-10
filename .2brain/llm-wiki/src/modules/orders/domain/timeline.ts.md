---
source: src/modules/orders/domain/timeline.ts
sha256: d455d000fd10f34414b8ad4945820461eb3d16bd8199253b7adfbf873b75f71e
signature: cb638836579423271a83b0f813042c5721bf7e2c419c98850523103423c83854
generated_at: 2026-11-10T04:59:29.362037+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/timeline.ts

## Purpose
Pure domain logic that turns one order-timeline entry (as the API sends it) into a display-ready `{ title, detail? }` pair. All i18n and formatting is injected via `TimelineTools`, so the same function serves the Vue component and plain unit tests without importing Vue or an i18n library.

## Key elements
- **`OrderTimelineType`** — union of the `type` discriminants across all `OrderTimelineEntry` variants (derived from `@types`).
- **`DataOf<T>`** — distributive conditional type that maps a timeline type to its specific `data` shape; a rename or retype in the contract becomes a compile error here.
- **`TimelineTools`** — injected interface: `t`, `has`, `money`, `day`, `utcDate`. Keeps the file framework-free.
- **`TimelineLine`** — output shape: `{ title: string; detail?: string }`.
- **`describeTimelineEntry(entry, tools)`** — the main export; looks up the type's detail builder, filters out absent fragments, joins with `' · '`, and returns the line.
- **`DETAILS`** — partial mapped table `[T in OrderTimelineType]?: DetailBuilder<DataOf<T>>`; each entry is a small function returning an array of fragments (or `undefined` for absent fields).
- **Helper builders** — `codeLabel` (dictionary lookup with raw-code fallback), `coded` (labelled fragment from a code dict), `plain` (labelled fragment for a scalar), `causeNote` (cancel-cause sentence only when worded), `amountOf`, `statusMove`, `refundParts`, `disputeParts`, `returnReason`, `documentNumber`, `dateMove`, `delayNotice`.
- **`detailsOf<T>`** — generic indexer over `DETAILS` so that `type` and `data` stay paired at the call site.

## Relationships
- **`src/modules/orders/components/OrderTimeline.vue`** — calls `describeTimelineEntry` (and imports `TimelineTools`, `TimelineLine`); supplies the real `t`, formatters, etc.
- **`src/modules/orders/domain/index.ts`** — barrel that re-exports this module's public types and `describeTimelineEntry` to the rest of the orders feature.
- **`src/modules/orders/tests/timeline-domain.spec.ts`** — exercises `describeTimelineEntry` and the detail builders with a mocked `TimelineTools`, no Vue or i18n runtime needed.

## Notes
- `DataOf<T>` deliberately avoids `Extract` because a variant whose `type` is a *subset* of a wider enum would collapse to `never` under `Extract`; the distributive-conditional form handles that correctly.
- `DETAILS` is **partial**: types absent from the map (e.g. a type whose title is self-sufficient) simply produce no `detail` string.
- `refund_issued`, `refund_settled`, `refund_canceled` all share the `refundParts` builder; `refund_failed` extends it with an extra `failureReason` fragment.
- `day` vs. `utcDate`: `day` is a shop-day with no zone shift (promised dates); `utcDate` reads the ISO date as its UTC day (withdrawal deadlines). They are intentionally different formatters.
- `codeLabel` falls back to the **raw code** when the dictionary has no translation — the design choice is "readable beats missing" for forward-compat with newer API codes.
- `causeNote` returns `undefined` (suppressing the fragment) for ordinary cancel causes, since the `by` field already communicates *who*; only causes with a dedicated i18n sentence are surfaced.
