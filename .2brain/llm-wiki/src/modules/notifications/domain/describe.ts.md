---
source: src/modules/notifications/domain/describe.ts
sha256: d8695fffe91ffd2bd0dfd82b6a04af383d713d466153b911b9d547324fa45fec
generated_at: 2026-10-17T01:08:36.900940+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/domain/describe.ts

## Purpose

Pure domain function that turns a stored notification row (`code` + `params`) into the sentence the reader sees. The server stores no text—only a code and the facts that sentence needs—so this module is the single place that knows how to compose those facts into locale-aware prose. It receives the translate and date-format callbacks from the caller, keeping it free of any locale or i18n machinery.

## Key elements

- **`describeNotification`** (exported) — Main entry point. Switches on `notification.code` and returns the finished sentence via the injected `translate`. Unknown codes fall back to a generic dictionary key.
- **`productName`** (exported) — Resolves a product name from a `ProductTitles` map by trying preferred locales first, then any non-empty value, then a generic i18n key.
- **`notificationOrderId`** (exported) — Returns the `orderId` for the two preorder codes; `undefined` for all other codes.
- **`Translate`** (exported type) — Minimal signature of vue-i18n's `t`: key plus optional named values.
- **`DescribableNotification`** (exported type) — Maps over the `Notification` union to keep each variant's `code`/`params` paired, enabling the `switch` to narrow params without casts.
- **`FormatDate`** (exported type) — `(iso: string) => string`; injected so the domain layer has no locale awareness.
- **`describePreorder`** (internal) — Handles `preorder-delayed` and `preorder-confirm-wait`, choosing between the full and date-less dictionary keys.
- **`refusedLine`** (internal) — Formats one line of a `cart-merge-refused` sentence ("Name × qty").
- **`PREORDER_KEYS`** (internal constant) — Literal map of each preorder code to its full/undated dictionary keys, so the unused-key check can see them.

## Relationships

- **`domain/index.ts`** — Barrel file; re-exports this module's public API (`describeNotification`, `productName`, `notificationOrderId`, types) so consumers import from the domain entry point.
- **`store.ts`** — Consumes the exports: calls `describeNotification` to produce display text, `productName` for inline labels, and `notificationOrderId` to link a notification to its order.
- **`tests/describe.spec.ts`** — Unit tests exercising `describeNotification`, `productName`, and `notificationOrderId` across codes, locale fallbacks, and edge cases (empty titles, missing dates, unknown codes).

## Notes

- **Pure by design.** `translate` and `formatDate` are always injected; the module never imports an i18n instance. `formatDate` defaults to identity (ISO passthrough) if the caller omits it.
- **`titles` is a snapshot.** Product names are copied into the notification at write time as a locale→name map, because the notification outlives the product record. `productName` therefore never fetches—only reads the stored map.
- **Union-narrowing trick.** `DescribableNotification` maps over each `Variant` individually rather than applying `Pick` to the whole union; this keeps `code` and `params` correlated so the `switch` gives each case its exact params type.
- **Unknown-code safety.** The `default` branch returns a generic i18n string, so a newer backend code never leaks its raw key to the reader.
- **Separators are constants** (`LINE_SEPARATOR`, `NAME_SEPARATOR`) but are applied *before* translation; the dictionary entry owns the final word order.
