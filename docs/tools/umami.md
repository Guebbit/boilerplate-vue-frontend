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
    UserAction[User action\nor navigation] --> Store[useObservabilityStore\ntrack()]
    Store --> Umami[Umami tracker\noptional]
    Nav[Route change] -.automatic pageview.-> Umami
```

Two things this shape is meant to force, both explained in full on the Observability page: custom
events go through the store rather than `window.umami`, and pageviews are the tracker's job rather
than the router's.

## Why the frontend emits so few events

This app can fire exactly four event names. That is not an oversight — the backend already emits
the product events (a product view, a cart change, a completed checkout) from the request that
performed them, where the data is authoritative. The frontend only names the moments no request
can carry: the app booting, a token discarded in the browser, a checkout that never reached the
API.

Emitting the same event from both sides would double-count it, and letting the frontend own the
canonical version would make the analytics depend on whether a tracker script loaded.

## External references

- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)
- [Umami custom events](https://umami.is/docs/track-events)

## Related pages

- [Observability](./observability.md) — the complete reference
- [Request Flow](../theory/request-flow.md)
