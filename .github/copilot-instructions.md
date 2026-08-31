# Copilot instructions

Repo = Vue frontend boilerplate.
This repo = `boilerplate-vue-frontend`.
Single package. SPA. Vue 3 + Pinia + Vue Router + OpenAPI-generated client.
Observability: Grafana Faro (errors + frontend tracing + web-vitals) + Umami (product analytics). Self-hosted local stack — no SaaS.

Human-facing docs: [README.md](../README.md) · [PAIRING.md](../PAIRING.md).

## Mandatory pre-work checklist

- Treat this file as required repository policy and follow it during the whole task.
- For every change, check whether documentation must be updated.

## Architecture brain

The one rule everything else serves: **deleting a domain is `rm -rf` of one folder plus removing
one line from `src/modules.ts`.** See [docs/theory/modules.md](../docs/theory/modules.md).

- Four tiers, dependencies pointing one way, enforced by `no-restricted-imports` per tier:
  `infrastructure` (knows nothing about this app) → `ui` (design system) → `kernel` (this KIND of
  app, no domain — the module registry, and nothing else) → `modules` (one domain each).
- A module may carry `domain/`: pure rules, lint-guaranteed free of vue, pinia, axios, every tier
  and its own module's outer files. Thin on a frontend by design — prices, totals and eligibility
  come from the API. Most modules have none. See
  [docs/theory/domain-layer.md](../docs/theory/domain-layer.md).
- **No shared file may name a domain except `src/modules.ts`.** Navigation entries, response
  schemas and locale dictionaries are all declared on the module manifest (`module.ts`) and
  collected by the registry — never listed centrally.
- A module reaches a sibling through its **public barrel** (`@/modules/<name>`) and never its
  internals. Add a barrel only when another module needs something; `account` has none.
- `infrastructure` may not import `@/modules`. When it owns a mechanism whose data is domain knowledge —
  the response-schema map, the i18n dictionaries — the composition root (`src/main.ts`) hands it
  **down** via a `register*` call. Do not invert this by importing upward.
- **Route names are strings.** Anything in `kernel` or `app` that addresses a module's route by name must
  guard with `router.hasRoute()` and degrade, or a deleted module leaves a control that navigates
  nowhere. Nothing type-checks this.
- A spec outside a module may **iterate** the registry; it may never **name** a domain. Per-domain
  assertions live in `src/modules/<name>/tests/`.

## Code brain

- Keep code SOLID.
- Keep code DRY.
- Keep code KISS.
- Prefer composables/stores over duplicated view logic.
- `openapi.yaml` first. Contract and all generated code starts there.
- Use generated API functions from `@api` (`contracts/rest/index.ts`); avoid manual endpoint wrappers unless required.
- Use generated Zod schemas from `@api/schemas` (`contracts/rest/schemas.zod.ts`) for form and response validation; never hand-write schemas that duplicate the spec.
- There is no mock API. Dev and every e2e profile run against the paired backend's demo profile (`npm run backend:demo`); a new endpoint is implemented there, not imitated here.
- Keep comments short and practical.
- Avoid `async` / `await` + `try/catch` unless necessary.
- Comments short. ADHD friendly. Explain function/constant/block fast.
- **All functions and important code blocks must have a JSDoc comment** in multi-line `/** \n * ... \n */` block format. Use `/**`, never a plain `/*` block: TypeScript only attaches docs to a symbol from `/**`, so `/*` loses the editor tooltip, the hover signature and `@param` hints at call sites. Include `@param` and `@returns` where useful. One line per tag.
- Do not dump long essays in code comments. Put detail in docs.

## Docs brain

- Keep docs concise and visual.
- Keep frontend-specific sections frontend-specific (Vite, Pinia, Router, Cypress).
- Keep shared contract sections aligned with backend docs (`openapi.yaml`, `gen:api`, contract sync).
- Link related sections instead of duplicating long explanations.

## Change brain

- Boilerplate is example-focused: keep changes small but complete.
- Do not break API contract without updating `openapi.yaml`.
- After contract edits, regenerate `contracts/rest` with `npm run gen:api`.
- Keep auth, i18n, and error-handling flows consistent across stores/composables.
- **Never** create backward-compatibility shims, legacy aliases, or transitional code unless explicitly requested. Fix forward; remove old code immediately.

## Observability brain

All observability code lives in the Pinia store `src/infrastructure/observability.ts`, accessed via `useObservabilityStore()` (or the `useObservability()` composable in components). Never import the Faro SDK or touch `window.umami` directly from a module or a component.

Two separate jobs — do not conflate them:

1. **Grafana Faro** — errors/crashes, frontend tracing, web-vitals. Browser sends only to Grafana Alloy's Faro receiver (`:12347`), never directly to the OTel collector / Loki / Prometheus. Tracing propagates the W3C `traceparent` header to the API origin so FE and BE traces link.
2. **Umami** — product analytics. Tracker script is injected; pageviews are automatic (no manual `page_view` event). There is no `track()` — this app emits no custom events, the backend does.

### How to track events

```ts
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';

const obs = useObservabilityStore();

// Errors go to Faro
obs.captureException(error);

// Identity, best-effort, after login
obs.identifyUser('user-123');
```

### Event taxonomy

**This app emits no custom analytics events.** Pageviews (including SPA route changes) are written
by the Umami tag itself, and web vitals, errors and a span per fetch/XHR go to Faro. Everything
else — signups, logins, logouts, cart and wishlist mutations, checkout outcomes, orders, payments —
is emitted by the backend from the handler that decided it, where an extension cannot block it, a
closing tab cannot lose it and a console cannot forge it. The names live in the backend's
`src/modules/<name>/analytics.ts`.

### Rules

- **No PII** in event properties — never send email, name, or personal data.
- **Check the backend first** — before adding any client-side event, confirm the API cannot report the same fact. A name emitted from both sides writes two rows nothing downstream can tell apart.
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
| `VITE_UMAMI_SRC`        | Umami tracker script URL (default `http://localhost:3080/script.js`) |

Trace propagation targets `VITE_API_URL`.
