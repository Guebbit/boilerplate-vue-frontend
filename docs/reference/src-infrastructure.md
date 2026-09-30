# Infrastructure

`src/infrastructure/` is the substrate: everything the application runs _on_, and nothing about
any domain. It is the bottom tier — it never knows modules exist, and `eslint.config.ts` stops it
finding out.

The mirror of the backend's tier of the same name, doing the browser-side half of the same jobs.

Each name below is a **concern**, never a kind: a folder once a concern needs more than one file,
a bare file while it needs one. There is no `stores/`, `helpers/` or `types/` bucket — a Pinia
store sits with the concern it serves, under the name of the job it does.

---

## The groups

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 40, 'rankSpacing': 50}}}%%
flowchart LR
    Http["http/<br/><i>one axios instance</i>"] --> Session["session.ts<br/><i>token + viewer</i>"]
    LocaleOverrides["locale-overrides.ts<br/><i>admin-edited copy</i>"]
    Obs["observability/<br/><i>Faro · Umami</i>"]
    Sse["create-sse-client.ts<br/><i>typed EventSource</i>"]
    Utils["utils/<br/><i>errors · formatters · logger</i>"]

    classDef a fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef b fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef c fill:#ede9fe,stroke:#7c3aed,color:#111827;
    class Http,Session a;
    class LocaleOverrides,Sse b;
    class Obs,Utils c;
```

## `http/` — the API transport

Every request the app makes goes through one axios instance. The generated clients call it; they
never build a request themselves.

| File                                             | What it is                                                                                                                                                                                                  | Read next                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/infrastructure/http/index.ts`               | The transport's public surface: one axios instance, its interceptors, and the single unwrap point.                                                                                                          | [OpenAPI Workflow](../api/openapi-workflow.md)                               |
| `src/infrastructure/http/client.ts`              | The shared axios instance every generated client goes through — base URL, credentials, timeouts.                                                                                                            | [Environment Variables](../tools/environment.md)                             |
| `src/infrastructure/http/interceptors.ts`        | Attaches the access token and reads it from outside a component scope, which is what lets a plain function make an authenticated call.                                                                      | [Security](../tools/security.md)                                             |
| `src/infrastructure/http/refresh.ts`             | The refresh-and-retry flow on a 401, and the endpoint list that must **never** trigger it — a 401 on the login or refresh route is a genuine answer, not a stale token.                                     | [Security](../tools/security.md)                                             |
| `src/infrastructure/http/step-up.ts`             | The step-up flow: a `REAUTH_REQUIRED` 401 is parked, answered by one password prompt, and replayed once a fresh session exists. Sits outside the refresh interceptor so it sees the error code first.       | [Account module](../modules/account.md#step-up-re-authentication)            |
| `src/infrastructure/http/reauth-prompt.ts`       | The Pinia store behind that prompt: whether it is open, and the promise the parked requests wait on. Lives here because the interceptor reads it and this tier may not import `ui`.                         | [Account module](../modules/account.md#step-up-re-authentication)            |
| `src/infrastructure/http/single-flight.ts`       | One in-flight attempt shared by every caller that arrives while it runs — what makes five simultaneous 401s share one refresh and one prompt.                                                               | [Security](../tools/security.md)                                             |
| `src/infrastructure/http/idempotency.ts`         | One reusable `Idempotency-Key` per user intent: kept across a retryable failure, replaced after a definitive answer.                                                                                        | [Request Flow](../theory/request-flow.md)                                    |
| `src/infrastructure/http/etag.ts`                | Conditional writes, client side: remembers the `ETag` a read or write answered with, sends it back as `If-Match` on the next write of that resource, forgets it when an action without a tag made it stale. | [Request Flow](../theory/request-flow.md#conditional-writes)                 |
| `src/infrastructure/http/antibot.ts`             | What a form fronting the backend's human-challenge gate needs: attach a solved token to a request, and recognise the 401 that means "show the widget and retry".                                            | [Security](../tools/security.md)                                             |
| `src/infrastructure/http/envelope.ts`            | Readers for the `{ data }` envelope the API wraps most payloads in, so a caller works with the payload rather than the wrapper.                                                                             | [Endpoints](../api/endpoints.md)                                             |
| `src/infrastructure/http/validate.ts`            | Whether a response is parsed through its contract schema before the app sees it — the switch that turns the API's promises into a checked claim rather than a trusted one.                                  | [OpenAPI Workflow](../api/openapi-workflow.md)                               |
| `src/infrastructure/http/response-schema-map.ts` | Maps every generated call site (method + URL) to the Zod schema validating its response. What makes the check above possible without a hand-written schema per call.                                        | [OpenAPI Workflow](../api/openapi-workflow.md) · [Contracts](./contracts.md) |
| `src/infrastructure/http/url.ts`                 | The one rule for turning a request URL into the pathname the layer matches on, so the route-schema table and the refresh exclusion list cannot recognise different sets of URLs.                            | [OpenAPI Workflow](../api/openapi-workflow.md)                               |
| `src/infrastructure/http/types.ts`               | The transport's own types — the request payload shape the generated clients hand over.                                                                                                                      | [App, Kernel & Types](./src-app.md)                                          |

The i18n runtime itself — the vue-i18n instance, locale loading, the locale-aware link helper —
does not live here. It is `src/i18n/`, a separate, extractable tier below this one (FE-D5): see
[Layers](../theory/layers.md#tiers). Only `locale-overrides.ts`, below, stays in `infrastructure`,
because it is the one piece that calls the generated `@api` client.

## `observability/`

The two telemetry back ends behind one surface. Faro reports errors, traces and web vitals; Umami
reports product analytics. A caller emits and never learns which one answered.

| File                                         | What it is                                                                                                                                               | Read next                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/infrastructure/observability/config.ts` | Environment-driven configuration for the two back ends — which are enabled, and with what keys. An unset variable is the opt-in switch: no URL, no Faro. | [Observability](../tools/observability.md) · [Environment Variables](../tools/environment.md) |
| `src/infrastructure/observability/store.ts`  | The Pinia store that lazily initialises both SDKs and exposes the one emit surface the app calls.                                                        | [Observability](../tools/observability.md) · [Umami](../tools/umami.md)                       |

## Single-file concerns

None has earned a folder: one file, one job, at the tier root.

| File                                      | What it is                                                                                                                                                                                                                                                                                                                                                | Read next                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/infrastructure/session.ts`           | The visitor's session: a token, and the least the app must know about whoever holds it. A Pinia store, filed under what it holds rather than under what it is built with.                                                                                                                                                                                 | [Security](../tools/security.md) · [State & Routing](../tools/state-and-routing.md) |
| `src/infrastructure/create-sse-client.ts` | The typed `EventSource` wrapper: subscribes to a stream, decodes each event against the generated realtime types, and forwards the stream's errors to the caller — the browser's own `EventSource` does the retrying, this wrapper adds no reconnect logic of its own. `EventSource` cannot set headers, which is why the stream authenticates by cookie. | [Realtime](../tools/realtime.md)                                                    |
| `src/infrastructure/locale-overrides.ts`  | The runtime half of the dictionaries: which languages exist, and what an admin has edited. The bundled files (`src/i18n/`) are defaults; this is what lets copy change without a deploy.                                                                                                                                                                  | [Admin Dashboard](../tools/admin-dashboard.md)                                      |

## `utils/`

| File                                                     | What it is                                                                                                                                                  | Read next                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/infrastructure/utils/logger.ts`                     | The only module allowed to touch `console` — `no-console` is an error everywhere else, so this is the seam where that ban is paid for once.                 | [Observability](../tools/observability.md)                   |
| `src/infrastructure/utils/errors.ts`                     | Extracts a human-readable message from any thrown or rejected value, so a `catch` never renders `[object Object]`.                                          | [Endpoints](../api/endpoints.md)                             |
| `src/infrastructure/utils/formatters.ts`                 | Display formatting — dates, money, and the shared fallback rendered when a value is empty or unavailable.                                                   | [UI Kit](./src-ui.md)                                        |
| `src/infrastructure/utils/images.ts`                     | Given a record's `imageUrl` or `thumbnailUrl`, what `<img src>` gets: resolved to absolute, or the bundled placeholder when the API stored nothing.         | [UI Kit](./src-ui.md)                                        |
| `src/infrastructure/utils/forms.ts`                      | Form plumbing shared by the modules: dropping `null`s from a PATCH body, and the upload-then-clear sequence a multipart part cannot express in one request. | [Security](../tools/security.md)                             |
| `src/infrastructure/utils/use-blocking-error.ts`         | One workflow's own blocked state: a message shown in place beside what it blocked, with a real failure still reported to Faro.                              | [Request Flow](../theory/request-flow.md)                    |
| `src/infrastructure/utils/use-stale-record.ts`           | What an edit form does with a 412: a warning in place, a "reload latest" that re-reads the record, never a silent resend.                                   | [Request Flow](../theory/request-flow.md#conditional-writes) |
| `src/infrastructure/utils/use-reset-on-viewer-change.ts` | Empties a store's per-person state when the signed-in person leaves or is replaced, so a cart or a wishlist never outlives its owner on a shared tab.       | [Security](../tools/security.md)                             |
| `src/infrastructure/utils/use-clear-query-on-mount.ts`   | Removes a credential (an emailed token) from the address bar once the page has read it.                                                                     | [Security](../tools/security.md)                             |
| `src/infrastructure/utils/country-codes.ts`              | The ISO 3166-1 country list the address forms offer.                                                                                                        | [Account module](../modules/account.md)                      |
| `src/infrastructure/utils/uploads.ts`                    | Client-side limits for the multipart image fields, mirroring what the API will accept so a rejection happens before the request.                            | [Security](../tools/security.md)                             |
