# Copilot instructions

Repo = Vue frontend boilerplate.
This repo = `boilerplate-vue-frontend`.
Single package. SPA. Vue 3 + Pinia + Vue Router + OpenAPI-generated client.
Observability: Sentry (errors + performance) + PostHog (analytics + feature flags).

Human-facing docs: [README.md](../README.md) · [PAIRING.md](../PAIRING.md).

## Mandatory pre-work checklist

- Treat this file as required repository policy and follow it during the whole task.
- For every change, check whether documentation must be updated.

## Code brain

- Keep code SOLID.
- Keep code DRY.
- Keep code KISS.
- Prefer composables/stores over duplicated view logic.
- `openapi.yaml` first. Contract and all generated code starts there.
- Use generated API functions from `@api` (`contracts/rest/index.ts`); avoid manual endpoint wrappers unless required.
- Use generated Zod schemas from `@api/schemas` (`contracts/rest/schemas.zod.ts`) for form and response validation; never hand-write schemas that duplicate the spec.
- When adding a new endpoint handler for MSW, start from the generated stub in `tests/mocks/generated.ts`, then move business logic to `tests/mocks/handlers/`.
- Keep comments short and practical.
- Avoid `async` / `await` + `try/catch` unless necessary.
- Comments short. ADHD friendly. Explain function/constant/block fast.
- **All functions and important code blocks must have a JSDoc comment** in multi-line `/* \n * ... \n */` block format (not `/** */`). Include `@param` and `@returns` where useful. One line per tag.
- Do not dump long essays in code comments. Put detail in docs.

## Docs brain

- Keep docs concise and visual.
- Keep frontend-specific sections frontend-specific (Vite, Pinia, Router, Cypress, MSW).
- Keep shared contract sections aligned with backend docs (`openapi.yaml`, `genapi`, contract sync).
- Link related sections instead of duplicating long explanations.

## Change brain

- Boilerplate is example-focused: keep changes small but complete.
- Do not break API contract without updating `openapi.yaml`.
- After contract edits, regenerate `contracts/rest` with `npm run genapi`.
- Keep auth, i18n, and error-handling flows consistent across stores/composables.
- **Never** create backward-compatibility shims, legacy aliases, or transitional code unless explicitly requested. Fix forward; remove old code immediately.

## Observability brain

All observability code lives in `src/plugins/observability/`. Never scatter tracking calls directly from vendors.

### Module structure

```
src/plugins/observability/
├── index.ts        — barrel exports (use as import source)
├── sentry.ts       — @sentry/vue init, identify/unidentify, breadcrumbs
├── posthog.ts      — posthog-js init, identify/unidentify, feature flags
└── analytics.ts    — AnalyticsEvents catalog + high-level track() helpers
```

### How to track events

```ts
// Import from barrel
import {
    AnalyticsEvents,
    track,
    trackProductView,
    trackItemAddedToCart,
    trackOrderPlaced
} from '@/plugins/observability';

// Track a named event
track(AnalyticsEvents.PAGE_VIEW, { path: '/products' });

// Use convenience helpers
trackProductView('123', 'Widget');
trackItemAddedToCart('123', 2);
trackOrderPlaced('order-abc', 49.99, 3);
```

### Event taxonomy

| Category   | Events                                                         |
| ---------- | -------------------------------------------------------------- |
| Lifecycle  | `app_started`, `app_ready`                                     |
| Navigation | `page_view`                                                    |
| Auth       | `user_signed_up`, `user_logged_in`, `user_logged_out`          |
| Cart       | `item_added_to_cart`, `item_removed_from_cart`, `cart_cleared` |
| Orders     | `order_checkout_started`, `checkout_completed`, `order_placed` |
| Products   | `product_viewed`, `product_searched`                           |
| Feedback   | `feedback_submitted`                                           |

### Rules

- **No PII** in event properties — never send email, name, or personal data.
- **Use constants** from `AnalyticsEvents` — never hardcode event name strings.
- **Fire-and-forget** — analytics calls must be async-safe; no `await` on `track()`.
- **Both systems for errors** — Sentry captures exceptions + performance; PostHog captures product analytics + feature flags.
- **Disabled locally** — both Sentry and PostHog are no-ops when DSN/API key env vars are missing.

### Environment variables

| Variable                         | Purpose                                               |
| -------------------------------- | ----------------------------------------------------- |
| `VITE_SENTRY_DSN`                | Sentry DSN (empty = disabled)                         |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Sentry trace sample rate (`0`..`1`)                   |
| `VITE_POSTHOG_API_KEY`           | PostHog project API key (empty = disabled)            |
| `VITE_POSTHOG_HOST`              | PostHog host URL (default: `https://app.posthog.com`) |
