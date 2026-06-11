# Observability Plugin

Thin wrapper around **Sentry** (errors + performance) and **PostHog** (product analytics + feature flags).

## Structure

```
src/plugins/observability/
├── index.ts        — barrel exports
├── sentry.ts       — @sentry/vue init, identify/unidentify, breadcrumbs
├── posthog.ts      — posthog-js init, identify/unidentify, feature flags
└── analytics.ts    — AnalyticsEvents catalog + track() helpers
```

## How to use

```ts
import { AnalyticsEvents, track } from '@/plugins/observability';

track(AnalyticsEvents.USER_LOGGED_IN, { method: 'email' });
```

## Event taxonomy

| Category | Events |
|---------|--------|
| Lifecycle | `app_started`, `app_ready` |
| Navigation | `page_view` |
| Auth | `user_signed_up`, `user_logged_in`, `user_logged_out` |
| Cart | `item_added_to_cart`, `item_removed_from_cart`, `cart_cleared` |
| Orders | `order_checkout_started`, `checkout_completed`, `order_placed` |
| Products | `product_viewed`, `product_searched` |
| Feedback | `feedback_submitted` |

## Rules

- **No PII** in event properties.
- **Use constants** from `AnalyticsEvents` — never hardcode strings.
- **Fire-and-forget** — never `await` a `track()` call.
- Both systems are **disabled locally** when env vars are missing.

## Environment variables

| Variable | Purpose |
|---------|--------|
| `VITE_SENTRY_DSN` | Sentry DSN (empty = disabled) |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Sentry trace sample rate (`0`..`1`) |
| `VITE_POSTHOG_API_KEY` | PostHog API key (empty = disabled) |
| `VITE_POSTHOG_HOST` | PostHog host (default: `https://app.posthog.com`) |