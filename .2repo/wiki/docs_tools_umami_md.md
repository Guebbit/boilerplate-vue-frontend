# docs/tools/umami.md

## Purpose

Explains *why* Umami is the product-analytics layer in this boilerplate (self-hosted, open-source, no cookies by default) and the design rationale behind its event flow. It deliberately contains no operational rules, env-var specs, or code examples — those live exclusively in `docs/tools/observability.md` to prevent the two pages from drifting.

## Key elements

- **Rationale for Umami** — chosen for self-hosting, no vendor lock-in, no default cookies; complements Faro (infrastructure health) with product-level "are users doing what we expect?" signals.
- **Event flow (Mermaid diagram)** — custom events route through `useObservabilityStore.track()` rather than calling `window.umami` directly; pageviews are fired automatically by the tracker on route change, not by the router.
- **Four-event constraint** — the frontend may emit exactly four event names. Product events (view, cart change, checkout) are emitted by the backend at the point of the request where data is authoritative; the frontend only names moments no request carries (app boot, token discard, checkout that never hit the API).
- **External references** — links to Umami's tracker-configuration and custom-events docs.

## Relationships

- **`docs/tools/tools-explained.md`** — parent tools-overview page; this page is its Umami detail section (linked from the overview).
- **`docs/tools/observability.md`** (referenced in-content) — the single source of truth for event taxonomy, env vars, and code examples. This page points readers there and avoids restating any of that material.
- **`docs/theory/request-flow.md`** (referenced in-content) — context for why backend-originated events are canonical.

## Notes

- The split between "why" (this page) and "how" (Observability) is a deliberate fix: the two pages previously duplicated rules and drifted until one documented functions that no longer existed.
- The four-event limit is a hard design constraint, not a TODO. Adding a fifth frontend event requires re-examining whether the event should instead be emitted server-side.
- If you need the actual event names, env-var names, or `track()` usage, go to `observability.md` — they are intentionally absent here.
