---
source: src/modules/payments/components/DisputeBanner.vue
sha256: 368f61bea427b2c7932b2a326b9e598c2e109194c5e938f6f3e41f2f0a5219bb
signature: 3e5ad205f470563d0fdd1f55cec0787d07a7cd6ebb7d0d3d6ad8bfa2b4d4b0d8
generated_at: 2026-11-10T05:07:38.508982+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/DisputeBanner.vue

## Purpose

Renders one or more `v-alert` banners for the disputes attached to a single payment. Each alert surfaces the dispute kind, current status, amount, reason, evidence deadline (with days-remaining or overdue count), and a link to the provider's dashboard. The component is display-only and staff-gated: the API only sends `disputes` to callers holding `display:Payment`, so this file trusts the prop it receives.

## Key elements

- **`defineProps<{ disputes: readonly Dispute[] }>`** — The sole prop; a frozen array of disputes ordered oldest-first. An empty array renders nothing.
- **`rows` (computed)** — Maps each `Dispute` into a display row with derived fields: `open`, `pausesRefunds`, `deadline`, and `dashboard`. Recomputes only when the input array changes.
- **`isOpen(dispute)`** — Returns `true` when status is `needs_response` or `under_review`.
- **`pausesRefunds` (derived in `rows`)** — `true` only when kind is `chargeback` **and** the dispute is open; other kinds never block refunds.
- **`deadlineOf(dueBy)`** — Computes days remaining (or overdue) from the raw date string and returns an i18n'd sentence plus an `overdue` flag. The server stores the date; the countdown is client-side.
- **`dashboardOf(dispute)`** — Returns `dispute.dashboardUrl` only if it starts with `https://`; otherwise `undefined` (guards against `javascript:` or other schemes).
- **`<script>` (options block)** — Declares `name: 'DisputeBanner'` for devtools / `<KeepAlive>` identity, since `<script setup>` cannot set `name` itself.
- **Template** — `v-for` over `rows`, each rendered as a `v-alert` (type `warning` if open, `info` otherwise) with `data-test` attributes on every meaningful element.

## Relationships

- **`src/modules/payments/components/OrderDisputes.vue`** — Sibling component in the payments module that handles a broader dispute list; this banner covers the per-payment view.
- **`src/modules/payments/components/PaymentDrawer.vue`** — Parent container in the same module; passes the payment's `disputes` array into this component's prop.
- **`src/modules/payments/tests/dispute-banner.spec.ts`** — Unit test that mounts the component with fixture `Dispute[]` values and asserts on the rendered alerts, deadline text, and dashboard-link visibility.

## Notes

- The deadline countdown (`deadlineOf`) is recomputed on every render pass, so a page left open past midnight will show the updated day count without a server round-trip.
- `pausesRefunds` is intentionally narrower than `open`: a `fraud`-type dispute in `needs_response` is open but does **not** pause refunds. Only `chargeback` + open does.
- All user-visible strings go through `vue-i18n` with keys namespaced under `dispute-banner.*`; no raw English text in the template.
- The `dashboardUrl` is treated as untrusted input from a third-party provider; the `https://` prefix check is the only sanitisation before it reaches an `<a href>`.
- The component is fully passive (no emits, no slots, no v-model); interaction is limited to the external dashboard link (`target="_blank"`, `rel="noopener noreferrer"`).
