# Copilot instructions

Repo = Vue frontend boilerplate.
This repo = `boilerplate-vue-frontend`.
Single package. SPA. Vue 3 + Pinia + Vue Router + OpenAPI-generated client.
Observability: Grafana Faro (errors + frontend tracing + web-vitals) + Umami (product analytics). Self-hosted local stack — no SaaS.

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

All observability code lives in the Pinia store `src/stores/observability.ts`, accessed via `useObservabilityStore()` (or the `useObservability()` composable in components). Never import the Faro SDK or touch `window.umami` directly from features/components.

Two separate jobs — do not conflate them:

1. **Grafana Faro** — errors/crashes, frontend tracing, web-vitals. Browser sends only to Grafana Alloy's Faro receiver (`:12347`), never directly to the OTel collector / Loki / Prometheus. Tracing propagates the W3C `traceparent` header to the API origin so FE and BE traces link.
2. **Umami** — product analytics. Tracker script is injected; pageviews are automatic (no manual `page_view` event); custom events via `track()`.

### How to track events

```ts
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

const obs = useObservabilityStore();

// Track a named event
obs.track(analyticsEvents.PRODUCT_VIEWED, { product_id: '123' });

// Convenience helpers
obs.trackProductView('123', 'Widget');
obs.trackItemAddedToCart('123', 2);
obs.trackOrderPlaced('order-abc', 49.99, 3);

// Errors go to Faro
obs.captureException(error);
```

### Event taxonomy

Event names are the canonical names the backend also emits, so FE and BE analytics line up.

| Category            | Events                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Lifecycle (FE-only) | `app_started`, `app_ready`                                                                      |
| Auth                | `user_signed_up`, `user_logged_in`, `user_logged_out`, `user_profile_viewed`, `account_deleted` |
| Products            | `products_searched`, `product_viewed`                                                           |
| Cart                | `cart_viewed`, `cart_item_added`, `cart_item_updated`, `cart_item_removed`, `cart_cleared`      |
| Checkout / Orders   | `checkout_completed`, `checkout_failed`, `order_created`, `orders_viewed`                       |

Pageviews are automatic (Umami) and are not in this table.

### Rules

- **No PII** in event properties — never send email, name, or personal data.
- **Use constants** from `analyticsEvents` — never hardcode event name strings, and keep them matching the backend's names.
- **Fire-and-forget** — analytics calls must be async-safe; no `await` on `track()`.
- **Two jobs, one store** — Faro handles errors/traces/web-vitals; Umami handles product analytics. No feature-flag provider exists (`isFeatureEnabled()` always returns `false`).
- **Disabled locally** — Faro is a no-op without `VITE_FARO_URL`; Umami is a no-op without `VITE_UMAMI_WEBSITE_ID`.

### Environment variables

| Variable                | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `VITE_FARO_URL`         | Grafana Alloy Faro receiver URL (empty = Faro disabled)              |
| `VITE_FARO_APP_NAME`    | App name reported to Faro (default `frontend`)                       |
| `VITE_FARO_APP_VERSION` | App version reported to Faro (default `1.0.0`)                       |
| `VITE_FARO_ENVIRONMENT` | Environment tag (default: Vite `MODE`)                               |
| `VITE_UMAMI_WEBSITE_ID` | Umami website id (empty = Umami disabled)                            |
| `VITE_UMAMI_SRC`        | Umami tracker script URL (default `http://localhost:8090/script.js`) |

Trace propagation targets `VITE_API_URL`.
