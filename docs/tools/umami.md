# Umami

## Why Umami is here

Umami is the **product analytics** layer in this boilerplate. It answers the "are users doing what we expect?" question from a product perspective, not an infrastructure one. It is self-hosted and open-source — no external SaaS account, no cookies by default.

## Event flow

```mermaid
flowchart LR
    UserAction[User action\nor navigation] --> Store[useObservabilityStore\ntrack()]
    Store --> Umami[Umami tracker\noptional]
    Nav[Route change] -.automatic pageview.-> Umami
```

## Role in the boilerplate

Umami tracks product events (signups, logins, product views, cart actions, checkouts). All custom events go through `useObservabilityStore()` — the store is a no-op when `VITE_UMAMI_WEBSITE_ID` is absent.

**Pageviews are tracked automatically** by the injected tracker script (it hooks SPA history changes), so there is no manual `page_view` event. All other events must be called explicitly in stores or composables, not in view templates.

Event names are the **canonical names the backend also emits**, so FE and BE analytics line up. Always use the `analyticsEvents` constants rather than raw strings.

## Feature flags

The local stack has no feature-flag provider. `isFeatureEnabled()` is kept for API compatibility but always returns `false`. If you need flags, wire in a dedicated provider and extend the store.

## Full usage reference

See [Observability](./observability.md) for the complete event taxonomy, usage examples, env vars, and the architectural overview of Faro + Umami together.

## External references

- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)
- [Umami custom events](https://umami.is/docs/track-events)

## Related pages

- [Observability](./observability.md)
- [Request Flow](../theory/request-flow.md)
