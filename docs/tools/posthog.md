# PostHog

## Why PostHog is here

PostHog is the **product analytics** layer in this boilerplate.
It answers the "are users doing what we expect?" question from a product perspective, not an infrastructure one.

## Event flow

```mermaid
flowchart LR
    UserAction[User action\nor navigation] --> Store[useObservabilityStore\ntrack()]
    Store --> PostHog[posthog-js\noptional]
```

## Role in the boilerplate

PostHog tracks product events (signups, logins, product views, cart actions, checkouts) and supports feature flags.
All calls go through `useObservabilityStore()` — the store is a no-op when `VITE_POSTHOG_API_KEY` is absent.

Page views are tracked automatically in `router.afterEach`. All other events must be called explicitly in stores or composables, not in view templates.

## Feature flags

```ts
const obs = useObservabilityStore();
if (obs.isFeatureEnabled('new-checkout-flow')) {
    // show new flow
}
```

Feature flags are evaluated client-side by the PostHog SDK after initialization.

## Full usage reference

See [Observability](./observability.md) for the complete event taxonomy, usage examples, env vars, and architectural overview of both Sentry and PostHog together.

## External references

- [PostHog JS SDK](https://posthog.com/docs/libraries/js)
- [PostHog feature flags](https://posthog.com/docs/feature-flags)
- [PostHog event capture](https://posthog.com/docs/product-analytics/capture-events)

## Related pages

- [Observability](./observability.md)
- [Request Flow](../theory/request-flow.md)
