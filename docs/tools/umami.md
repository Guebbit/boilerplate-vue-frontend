# Umami

The _why_. Every operational rule — the event taxonomy, the env vars, the code examples, the
architecture — lives in [Observability](./observability.md), and deliberately only there: this
page and that one used to restate the same rules, and the copies drifted until one of them
documented functions that no longer existed.

## Why Umami is here

Umami is the **product analytics** layer in this boilerplate. It answers "are users doing what we
expect?" from a product perspective, not an infrastructure one — the complement to Faro, which
answers "is the app healthy?".

It was chosen because it is **self-hosted and open-source**: no external SaaS account, no vendor
holding the data, and no cookies by default, which is what keeps the boilerplate deployable without
a consent banner or a data-processing agreement. The same reasoning picked every other piece of the
observability stack here — the whole thing runs locally under Docker/Podman.

## Event flow

```mermaid
flowchart LR
    Boot[App bootstrap] --> Store[useObservabilityStore\ninitUmami()]
    Store -.injects the tag.-> Umami[Umami tracker\noptional]
    Nav[Route change] -.automatic pageview.-> Umami
    API[API request] --> Backend[Backend handler] -->|"custom events"| Umami
```

The shape is the point: this app _injects_ the tracker and nothing else. Pageviews are the
tracker's job rather than the router's, and every custom event arrives at the same Umami website
from the other side of the API.

## Why the frontend emits no events

Not one. The backend emits every product event — a product view, a cart change, a completed
checkout, a logout — from the request that performed it, where the data is authoritative and where
an extension cannot block it, a closing tab cannot lose it and a console cannot forge it.

That leaves the frontend nothing to add. Its pageviews are written by the tag itself; its errors,
web vitals and fetch spans go to [Faro](./observability.md). There is no `track()` on the store,
because there was nothing left for it to send.

Emitting the same event from both sides would double-count it, and letting the frontend own the
canonical version would make the analytics depend on whether a tracker script loaded.

## External references

- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)
- [Umami custom events](https://umami.is/docs/track-events)

## Related pages

- [Observability](./observability.md) — the complete reference
- [Request Flow](../theory/request-flow.md)
