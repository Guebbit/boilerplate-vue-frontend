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
- `VITE_API_WEBSOCKET`: websocket URL used by demo page
- `VITE_API_MOCK_ENABLED`: enable API mocking (`true`/`false`)
- `VITE_AXIOS_TIMEOUT`: axios timeout in ms
- `VITE_APP_DEBUG_ROUTER`: enable router debug logs in dev (`true`/`false`)
- `VITE_APP_DEBUG_HOME`: enable Home view demo logs in dev (`true`/`false`)

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
