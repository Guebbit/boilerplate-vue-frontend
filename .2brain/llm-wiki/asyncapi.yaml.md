---
source: asyncapi.yaml
sha256: dcd335807e8bffa61145f70d7a313fb2858adbfd4581b7dd1093dc17698fa8e1
generated_at: 2026-10-16T23:53:52.660898+00:00
model: ollama:qwen3.8:27b
---

# asyncapi.yaml

## Purpose

Generated AsyncAPI 3.0.0 specification that bundles all real-time and event-driven contracts (SSE streams and outbound webhooks) from individual module fragments into a single, canonical document. It exists as the single source of truth for the shapes, semantics, and delivery mechanics of every non-HTTP event in the boilerplate, enabling downstream consumers (type generation, Spectral rules, documentation) to operate against one file.

## Key elements

- **Header / provenance** — Declares the file is produced by `npm run contracts:bundle` and lists every source fragment (`shared/contracts/asyncapi.root.yaml` plus per-module `asyncapi.yaml` / `asyncapi.webhooks.yaml` files). **Do not edit by hand.**
- **`servers`** — Three server entries: `sseLocal` (localhost:3000, `/observability/events`), `sseNotificationsLocal` (localhost:3000, `/notifications/stream`), and `subscriberEndpoint` (a *variable* server with `{subscriberHost}` / `{subscriberPath}` placeholders representing the per-subscription outbound webhook target).
- **`channels`** — 17 channels grouped by domain: `observability.*` (SSE: snapshot, updated, heartbeat), `notifications.*` (SSE: created, deleted, read), and webhook channels for `order.*`, `shipment.*`, `payment.*`, `return.*`, and `example.*`. Each binds to either an SSE server or `subscriberEndpoint`.
- **`operations`** — One `send` operation per channel, with descriptions that document *when* the event fires and *why* (e.g., 5-second tick interval, 15-second heartbeat, derivation from `status_changed` events).
- **`x-transport: sse`** — Custom extension on SSE channels; read by `scripts/contracts/generate-asyncapi-types.ts` to select which channels produce typed SSE payloads (not derivable from the channel name alone).
- **`$ref` message references** — Every message body is a pointer into a shared `components/messages` block (populated by the bundler from module fragments), keeping the root file declarative.

## Relationships

- **README.md** — The project's top-level README references this file (and the contracts tooling around it) as the entry point for understanding the event-driven surface of the boilerplate.

## Notes

- **Generated artifact.** Any change must be made in the source module fragments and re-bundled via `npm run contracts:bundle`; direct edits will be overwritten.
- **`subscriberEndpoint` is not a real host.** It is a structural placeholder so that Spectral rules (`asyncapi-servers`, `asyncapi-channel-servers`) can validate channel→server bindings. Each actual subscription carries its own URL at runtime.
- **SSE channel selection is via `x-transport`, not name prefix.** A channel outside the `observability.` / `notifications.` namespaces could still be SSE; the generator trusts only the extension.
- **Version `0.1.0` is intentional** (SemVer §4 initial development). The `check:asyncapi-breaking` rule ignores this field.
- **Webhook channel semantics are intentionally narrow.** For example, `order.cancelled` omits refund details (that's `payment.refunded`'s concern), and `order.paid` is derived from `status_changed` rather than a dedicated domain event — see the operation descriptions for the reasoning.
