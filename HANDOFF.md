# Observability Layer — Handoff

Last commit: `420acdc observability layer draft`  
Audit date: 2026-06-13

---

## What Is There

### Architecture

```
src/plugins/observability/
├── index.ts          barrel exports
├── sentry.ts         error tracking + performance + session replay
├── posthog.ts        product analytics + feature flags
└── analytics.ts      event catalog + track() helpers

src/stores/realtimeObservability.ts     Pinia store for SSE state
src/composables/useRealtimeObservability.ts   SSE connect/disconnect
api/services/ObservabilityService.ts    typed API client for backend metrics
```

### Integration Points (already wired)

| File | What is tracked |
|------|----------------|
| `src/main.ts` | `APP_STARTED`, `APP_READY`; calls `initSentry()` + `initPostHog()` |
| `src/router/index.ts` | `PAGE_VIEW` on every `afterEach` |
| `src/stores/profile.ts` | `USER_LOGGED_IN`, `USER_SIGNED_UP`, `USER_LOGGED_OUT` |
| `src/features/cart/store.ts` | `ITEM_ADDED_TO_CART`, `ITEM_REMOVED_FROM_CART`, `CART_CLEARED` |
| `src/features/orders/store.ts` | `CHECKOUT_COMPLETED` |

### Event Catalog (defined, 14 events)

`app_started` · `app_ready` · `page_view` · `user_signed_up` · `user_logged_in` ·
`user_logged_out` · `item_added_to_cart` · `item_removed_from_cart` · `cart_cleared` ·
`order_checkout_started` · `checkout_completed` · `order_placed` · `product_viewed` ·
`product_searched` · `feedback_submitted`

---

## What Is Broken or Missing

### Critical

**1. Double page-view tracking**  
PostHog is initialised with `capture_pageview: true` (auto-captures on init) **and** the router fires `track(PAGE_VIEW)` on every `afterEach`. First load is counted twice.  
Fix: set `capture_pageview: false` in `posthog.ts` init options (keep the router hook as the single source of truth).

**2. PII in event properties — violates the plugin's own rules**  
`profile.ts:88` — `USER_LOGGED_IN` sends `{ email }`.  
`profile.ts:113` — `USER_SIGNED_UP` sends `{ email, username }`.  
The README explicitly says "No PII in event properties." Use the user `id` only; put email on the Sentry/PostHog user context via `identifyUser()`.

**3. User identification is never called**  
`sentryIdentifyUser()` and `posthogIdentifyUser()` are exported but never invoked anywhere. Errors in Sentry have no user attached. PostHog cannot build a per-user funnel.  
Fix: call both inside `fetchProfile()` in `profile.ts` after the payload is stored, and call `sentryUnidentifyUser()` + `posthogUnidentifyUser()` (already exported as `resetSentry`/`resetPostHog`) inside `logout()` and `confirmAccountDelete()`.

**4. `router.onError` does not report to Sentry**  
`router/index.ts:89` catches all router errors and redirects but never calls `Sentry.captureException()`. Routing errors are silently swallowed from the error monitoring perspective.

### Missing Tracking (events defined but never fired)

| Event | Where to call it | Notes |
|-------|-----------------|-------|
| `PRODUCT_VIEWED` | `features/products/views/Product.vue` — `onMounted` after product loads | Use `trackProductView(id, title)` helper |
| `PRODUCT_SEARCHED` | `features/products/views/ProductsList.vue` — search/filter handler | Use `trackProductSearched(query)` helper |
| `ORDER_CHECKOUT_STARTED` | `features/cart/views/Cart.vue` — checkout button click, before calling `checkout()` | |
| `ORDER_PLACED` | `features/orders/store.ts` — inside `checkout()` after success, alongside `CHECKOUT_COMPLETED` | Use `trackOrderPlaced(id, total, count)` helper |
| `FEEDBACK_SUBMITTED` | wherever feedback form submits | |
| `updateCartItem` | `features/cart/store.ts:64` — quantity change is not tracked at all | Track as `ITEM_ADDED_TO_CART` with new quantity, or define a new `cart_item_updated` event |

### Incomplete Infrastructure

**Realtime SSE dashboard**  
`useRealtimeObservability` and `realtimeObservabilityStore` are wired and tested, but the only consumer is `features/realtime/views/RealtimePlayground.vue`. There is no production UI (admin dashboard page) that renders the live metrics.

**Feature flags unused**  
`isFeatureEnabled()` is exported but never consumed by any component or store.

**Sentry not integrated as Vue plugin**  
`sentry.ts` calls `Sentry.init()` manually but never calls `app.use(Sentry)`. The official `@sentry/vue` integration hooks into Vue's `errorHandler` and component stack traces when installed as a Vue plugin. Without it, component-level errors may not have Vue component context attached.

---

## Completion Plan (finishing what's there)

These are ordered by impact.

### Step 1 — Fix critical bugs (1–2 hours)

1. `posthog.ts` init: change `capture_pageview: true` → `capture_pageview: false`
2. `profile.ts` login event: remove `email` from properties, leave empty or add `{ method: 'email' }`
3. `profile.ts` signup event: remove `email` and `username` from properties

### Step 2 — Wire user identification (1 hour)

In `profile.ts`, update `fetchProfile()`:
```ts
.then((data) => {
  // ... existing payload logic ...
  if (payload?.id) {
    sentryIdentifyUser(payload.id);
    posthogIdentifyUser(payload.id);
    // optionally: sentrySetSessionProperties({ plan: payload.plan })
  }
})
```

In `logout()` and `confirmAccountDelete()`:
```ts
sentryUnidentifyUser();
posthogUnidentifyUser();   // already resets posthog session
```

### Step 3 — Fix Sentry Vue plugin integration (30 min)

In `main.ts`, before `app.mount()`:
```ts
import * as Sentry from '@sentry/vue';
// move Sentry.init() call here (before mount), pass { app } to Sentry.init
// OR: in sentry.ts, accept `app` as a parameter alongside `router`
```
This gives component stack traces in errors.

### Step 4 — Report router errors to Sentry (15 min)

In `router/index.ts` inside `router.onError()`:
```ts
import { captureException } from '@sentry/vue';
// at the top of the handler, before the redirect logic:
captureException(error, { extra: { path: router.currentRoute.value.fullPath } });
```

### Step 5 — Wire missing events (2–3 hours)

Add calls in the listed locations from the table above.  
All helpers already exist — this is purely calling them.

### Step 6 — Realtime admin dashboard UI (larger, separate feature)

Build a view under `/admin/observability` that mounts `useRealtimeObservability()`, shows the live metrics from `latestSnapshot` / `latestUpdate`, and renders health indicators. The store and composable are complete; only the UI is missing.

---

## Alternative Approaches (replace the current plugin style)

The current approach: a hand-rolled init wrapper in `src/plugins/observability/` with module-level singletons. Below are the industry-standard alternatives, from least to most invasive.

---

### Option A — Composable-first (least invasive refactor)

Keep Sentry + PostHog, but delete the plugin wrappers and expose everything through a single composable: `useObservability()`.

```ts
// src/composables/useObservability.ts
export const useObservability = () => {
  const track = (event: AnalyticsEventName, props?: Record<string, unknown>) => { ... }
  const identifyUser = (id: string) => { ... }
  return { track, identifyUser, ... }
}
```

**Pros:** Consistent with how the rest of the app is structured (Pinia stores + composables). No singleton init order issues. Tree-shakeable per component.  
**Cons:** Composables can only be called inside `setup()` — bootstrapping in `main.ts` still needs a non-composable approach, or you use a Pinia store as the singleton backing store.

---

### Option B — Vue Plugin pattern (proper `app.use()`)

Implement a real Vue plugin instead of standalone `init*()` functions:

```ts
// src/plugins/observability/plugin.ts
export const ObservabilityPlugin: Plugin = {
  install(app, options) {
    Sentry.init({ app, ...options.sentry })
    posthog.init(options.posthog.apiKey, ...)
    app.provide('observability', { track, identifyUser, ... })
    app.config.globalProperties.$obs = { track, ... }
  }
}

// main.ts
app.use(ObservabilityPlugin, { sentry: { dsn: ... }, posthog: { apiKey: ... } })
```

**Pros:** Idiomatic Vue. Sentry's Vue plugin properly installs the `errorHandler`. `provide/inject` is the Vue-standard DI pattern.  
**Cons:** Still Sentry + PostHog, still two vendors, still separate SDKs.

---

### Option C — Grafana Faro (recommended modern alternative)

[Grafana Faro Web SDK](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/instrument/javascript-bundle/) is a single SDK that replaces both Sentry and PostHog for error/performance/logging. Open source, self-hostable.

```
npm install @grafana/faro-web-sdk @grafana/faro-web-tracing
```

```ts
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

const faro = initializeFaro({
  url: 'https://your-collector/collect',
  app: { name: 'boilerplate-vue-frontend', version: '1.0.0' },
  instrumentations: [
    ...getWebInstrumentations({ captureConsole: true }),
    new TracingInstrumentation(),   // OTel traces under the hood
  ],
})

// One call does: error capture, custom events, performance traces, session replay
faro.api.pushEvent('user_logged_in', { method: 'email' })
faro.api.setUser({ id: userId })
```

**Pros:** One SDK, one integration point. Built on OpenTelemetry under the hood — standard wire format. Grafana Cloud has a generous free tier; or self-host with Grafana OSS + Loki + Tempo. No vendor lock-in on the protocol level.  
**Cons:** Requires a Grafana stack or Grafana Cloud. Less mature JS ecosystem than Sentry. Feature flags require a separate tool (PostHog, Unleash, GrowthBook) or Grafana OnCall.

---

### Option D — OpenTelemetry (OTel) native

The CNCF standard for observability. Zero vendor lock-in. Send to any backend.

```
npm install @opentelemetry/sdk-trace-web @opentelemetry/sdk-trace-base \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources @opentelemetry/semantic-conventions
```

**What you get:**
- Automatic HTTP tracing (Fetch / XHR)
- Document load / navigation timing
- Custom spans for business events
- Exports to: Jaeger, Grafana Tempo, Honeycomb, Datadog, New Relic, any OTel Collector

**What you don't get out of the box:**  
Session replay, feature flags, product analytics funnels — those need a separate tool (Hotjar/LogRocket for replay, PostHog/GrowthBook for flags).

**Typical pairing:**  
OTel → Honeycomb (best DX for distributed tracing) or OTel → self-hosted SigNoz (open source Datadog alternative).

**Pros:** Maximum portability. OTel is the industry-standard protocol used by every major vendor. Zero lock-in.  
**Cons:** Most DIY of all options. More config, more moving parts. Product analytics (funnels, cohorts) is not what OTel is for — you still want something like PostHog alongside it.

---

### Option E — Highlight.io (drop-in Sentry replacement, open source)

[Highlight.io](https://www.highlight.io) is an open-source, self-hostable replacement for Sentry. Same features (errors, session replay, logs), cleaner DX, actively maintained.

```
npm install @highlight-run/vue
```

```ts
import { H } from '@highlight-run/vue'
H.init('<PROJECT_ID>', { environment: 'production', version: '1.0.0' })
H.identify('user@example.com', { id: userId })
H.track('checkout_completed', { order_id: id, total })
```

**Pros:** Single SDK for errors + replay + logs + custom events. Vue plugin available. Self-host on Docker. Better session replay than Sentry.  
**Cons:** Smaller community than Sentry. No feature flags.

---

### Option F — Keep current stack, fix the integration issues

Fix the 6 issues in the Completion Plan above.  
The architecture is sound. The two-vendor split (Sentry = errors, PostHog = analytics) is a common, battle-tested pattern.  
If the objection is the **plugin folder style**, move to Option A (composable-first) without changing vendors.

---

## Recommendation

| Goal | Best choice |
|------|-------------|
| Finish fast, ship | Option F (fix completion plan) |
| Modern Vue idiom, same vendors | Option A (composable) or B (proper Vue plugin) |
| Open source, self-hosted, one SDK | Option C (Grafana Faro) or E (Highlight.io) |
| Zero vendor lock-in, OTel everywhere | Option D (OpenTelemetry native) |

For this boilerplate (which is meant to be a reference skeleton), **Option D + PostHog** is the most future-proof: OTel for errors/traces (vendor-agnostic), PostHog for analytics/flags. Any project using this boilerplate can swap the OTel exporter backend without touching application code.

---

## Environment Variables (current)

```env
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=0
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
VITE_SENTRY_DEBUG=false
VITE_SENTRY_ENVIRONMENT=

VITE_POSTHOG_API_KEY=
VITE_POSTHOG_API_HOST=https://app.posthog.com
VITE_POSTHOG_DEBUG=false

VITE_API_SSE=http://localhost:3000/observability/events
```

All observability is opt-in (disabled when keys are empty) — safe for local dev.
