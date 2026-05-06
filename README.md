# boilerplate-vue-frontend

Vue 3 + TypeScript frontend boilerplate with:

- Vite
- Pinia
- Vue Router
- Vue I18n
- OpenAPI-generated axios client
- Vitest + Cypress

## Requirements

- Node.js 22+
- npm

## Setup

1. Install dependencies:
    ```bash
    npm ci
    ```
2. Create your environment file:
    ```bash
    cp .env-example .env
    ```
3. Start dev server:
    ```bash
    npm run dev
    ```

## Environment variables

Use `.env-example` as reference.

- `VITE_APP_DEFAULT_LOCALE`: initial locale (example: `en`)
- `VITE_APP_SUPPORTED_LOCALES`: comma-separated supported locales (example: `en,it,es`)
- `VITE_APP_PUBLIC_PATH`: public path
- `VITE_APP_BASE_URL`: router history base URL (optional)
- `VITE_API_URL`: backend API base URL
- `VITE_API_WEBSOCKET`: websocket URL used by demo page (recommended format: `ws://...`; `http://...` is auto-converted)
- `VITE_API_MOCK_ENABLED`: enable API mocking (`true`/`false`)
- `VITE_AXIOS_TIMEOUT`: axios timeout in ms
- `VITE_APP_DEBUG_ROUTER`: enable router debug logs in dev (`true`/`false`)
- `VITE_APP_DEBUG_HOME`: enable Home view demo logs in dev (`true`/`false`)
- `VITE_SENTRY_DSN`: Sentry DSN (optional, disables Sentry when empty)
- `VITE_SENTRY_TRACES_SAMPLE_RATE`: Sentry tracing sample rate (`0` to `1`)

Sentry (briefly): it collects frontend crashes and optional performance traces,
so you can see what broke, where, and for which users in production.

When pairing locally with `boilerplate-node-backend`, set backend `NODE_CORS_ORIGIN`
to `http://localhost:8080` to match this frontend default dev port.

## Scripts

- `npm run dev`: start Vite dev server
- `npm run build`: type-check + build
- `npm run preview`: preview built app
- `npm run lint`: run ESLint
- `npm run lint:fix`: run ESLint autofix
- `npm run lint:openapi`: lint `openapi.yaml` with Spectral
- `npm run prettier`: run Prettier check
- `npm run prettier:fix`: run Prettier write
- `npm run test:unit`: run Vitest unit tests
- `npm run test:e2e`: run Cypress e2e tests
- `npm run genapi`: regenerate API client from `openapi.yaml`

## Architecture overview

- `/src/router`: route definitions and navigation guards
- `/src/stores`: Pinia stores for domain/state logic
- `/src/views`: page-level components
- `/src/components`: reusable UI components
- `/src/middlewares`: route middleware functions
- `/src/utils/http.ts`: shared axios instance and interceptors
- `/src/utils/api.ts`: generated API class wiring
- `/api`: OpenAPI-generated TypeScript axios client
- `/openapi.yaml`: API contract source

## API generation flow

1. Update `openapi.yaml`
2. Regenerate client:
    ```bash
    npm run genapi
    ```
3. Validate and update usages in stores/views if needed.

## Validation commands

Run these before opening or updating a PR:

```bash
npm run lint
npm run build
npm run test:unit
```

## Admin Dashboard

Route: `/:locale/admin` — requires admin role (redirects non-admins to Home).

The dashboard is split into two tabs:

### Overview tab

Fetches live data from two contract-defined endpoints:

| Endpoint                     | What it shows                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `GET /admin/health`          | API status, database status, uptime, memory, integrations (Loki, PostHog, OTEL), system info |
| `GET /admin/metrics/summary` | HTTP totals, error rate, in-flight requests, p50/p95 latency, auth events, business events   |

KPI cards at the top give an instant health snapshot:

```
┌─────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  API Status │ │   Database   │ │  Uptime  │ │  Requests    │
│     ok      │ │  connected   │ │  1h 30m  │ │    1042      │
└─────────────┘ └──────────────┘ └──────────┘ └──────────────┘
┌─────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   Errors    │ │  Error Rate  │ │ Lat. p50 │ │  Lat. p95    │
│     12      │ │    1.2%      │ │  18ms    │ │    85ms      │
└─────────────┘ └──────────────┘ └──────────┘ └──────────────┘
```

### Audit Log tab

Fetches from `GET /admin/audit` with optional filters:

- **Actor** – filter by user ID
- **Action** – filter by dot-notation action (e.g. `auth.login.failed`)
- **Outcome** – success / failure
- **Since** – ISO-8601 timestamp

Displays a colour-coded table with truncated request/trace IDs (hover for full value).

### Data contract

All types are driven by `openapi.yaml` (admin section) and reflected in:

- `api/api.ts` — generated interfaces (`AdminHealth`, `AdminMetricsSummary`, `AuditEventItem`, …)
- `src/types/admin.ts` — FE view-model types (`IAdminKpi`, `IAdminAuditFilters`)
- `src/composables/useAdminObservability.ts`
- `.dev/mocks/handlers/adminMockHandlers.ts` — MSW mock responses for dev/test

# TODO

- Fix tests
- Signup should send an email with a link to confirm the account
  (CHECK the api-mongodb-mongoose, it doesn't send the email and just create the user)
  Create the registration confirmation page
- Create the reset password page and reset password confirm page
- Add images upload in the various forms
- Always call useXYZStore() inside functions, not at the top level — avoids circular dependency issues (unless it is specifically dependent)
- Create a NUXT variant
- Create a Vuetify Variant
- Create a Quasar Variant
- Do Vitest tests
- Do Cypress tests
- Create skeleton version
- From skeleton: css-ui version
    - remember to take old \_root.scss and old \_cards.scss (for simple-card) from older commits
- From skeleton: vuetify version
- From skeleton: quasar version

# MAYBE?

- Extend use18n (or create a new use18n) to add some custom functions now present in the utils/i18n.ts
- From skeleton: bootstrap version
- Do lighthouse metrics tests
