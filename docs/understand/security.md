---
type: concept
audience: [developer]
---

# Security

This page describes security from the **frontend perspective**: how the SPA stores and uses auth tokens, and how route guards enforce access control.

For the backend auth architecture (JWT signing, bcrypt, refresh token DB storage), see the [backend docs](https://github.com/Guebbit/boilerplate-node-backend).

## Two session modes

The backend keeps people signed in one of two ways, chosen per deployment by `NODE_SESSION_MODE`. The SPA has no switch of its own: `useSessionStore().loadSessionMode()` reads `GET /config` once per tab and every code path adapts. `src/infrastructure/config.ts` makes that one request and shares it with the OAuth buttons and the human check, which read their own members of the same answer. `GET /shop` is the `shop` module's own call, so the core reads nothing the removable shop owns.

| Mode            | What the SPA holds                                     | On a `401`                                       | After a reload                                                       |
| --------------- | ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| `jwt` (default) | an access token in memory, a rotating refresh cookie   | `POST /account/refresh`, then replay the request | `isAuth` hint cookie, then a refresh, then `GET /account`            |
| `cookie`        | nothing readable: one `__Host-session` HttpOnly cookie | the session is over; no refresh (it is a 404)    | `isAuth` hint cookie, then `GET /account` (a `401` ends the session) |

Both modes get the same `isAuth` hint cookie from the backend (it sets it beside the session cookie, with the same lifetime) and write the same `rememberMe` marker, and both use `__Host-session` as the credential cookie. `session.hasSession` answers "is a session held" in either mode; `session.isAuth` adds "and the viewer is known". Login-shaped responses (login, 2FA, step-up, password change) all go through `session.adoptSession()`, so no caller asks which mode is on. The sessions list shows when each sign-in began and, in `cookie` mode, a device label such as "Firefox on Linux".

```mermaid
flowchart TD
    Boot[App boot] --> Cfg["GET /config"]
    Cfg --> Mode{mode}
    Mode -- jwt --> J["token in memory\nrefresh cookie rotates"]
    Mode -- cookie --> C["HttpOnly cookie only\nno token, no refresh"]
    J --> J401{"401?"}
    J401 -- yes --> Refresh["POST /account/refresh\nthen replay once"]
    C --> C401{"401?"}
    C401 -- yes --> End["session ends\nthe route guard decides"]

    classDef step fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef decision fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#111827;
    class Boot,Cfg,J,C,Refresh step;
    class Mode,J401,C401 decision;
    class End error;
```

The rest of this page describes the `jwt` flow in detail; `cookie` mode drops the token and the refresh step. The backend's [session-mode page](https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/modules/account-sessions.md#choosing-the-session-mode) explains when to pick which.

## Auth token model in `jwt` mode (what the FE sees)

The backend uses a **split-token model** (its [sessions theory](https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/understand/sessions.md) owns it). What
the FE sees: a short-lived access token in the login response body, sent on every protected call as
`Authorization: Bearer <token>`; and a refresh token in an `HttpOnly` cookie the browser sends
automatically on `POST /account/refresh`, which the FE never reads. That keeps the refresh token out
of JavaScript (no `localStorage`, no `document.cookie`).

## Login → auth → refresh flow (`jwt` mode)

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 80}}}%%
flowchart TD
    A[POST /account/login] --> B[Access token\nin response body]
    A --> C[Refresh token\nHttpOnly cookie\nset by backend]
    B --> D[Held in memory only\nnever localStorage]
    D --> E[Protected API call\nAuthorization Bearer]
    E --> F{401?}
    F -- no --> G[Success]
    F -- yes --> H[POST /account/refresh\nbrowser sends cookie]
    H --> I{Valid?}
    I -- yes --> J[New access token]
    J --> E
    I -- no --> K[Session ends, the route guard decides]

    classDef entry fill:#f0fdf4,stroke:#16a34a,color:#111827;
    classDef token fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef store fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef transport fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef decision fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef success fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef error fill:#fee2e2,stroke:#dc2626,color:#111827;

    class A entry;
    class B,C token;
    class D store;
    class E,H transport;
    class F,I decision;
    class G,J success;
    class K error;
```

### A session that ended under a public page

The backend refuses a stale bearer with `401` on a public page too (a product, a search), so that
a signed-in editor who only browses is seen as active and refreshed, not silently served as a
guest. The SPA has two ways a session really ends on such a request, and both fall back to a guest
by themselves:

```mermaid
flowchart TD
    R["request with a bearer"] --> F{"401?"}
    F -- "SESSION_IDLE" --> I["signalIdle: idle notice"]
    F -- "other" --> RF["POST /account/refresh"]
    RF -- "token" --> Again["replay with the new token"]
    RF -- "refused for good" --> X["signalExpired: expired notice"]
    RF -- "network or 5xx" --> Keep["session kept, error shown"]
    I --> G["replay once without Authorization"]
    X --> G
```

- The replay deletes `Authorization` from the copied request (clearing the session does not), and
  runs once (`_refreshed`): a private route's second `401` is its answer, and nothing loops.
- A request that carried no token is never replayed: being a guest was not what it was refused for.
- The notice is the session store's own, one per ending (the refresh is single-flight), and is
  not repeated per request. A refresh that failed in passing keeps the session and replays nothing.

## Where token logic lives

| Concern                            | File                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token storage + session state      | `src/infrastructure/session.ts` — the mode, the token or cookie session, a `{ id, email, role, … }` projection, and the caller's own rules            |
| The visitor's own account record   | `src/modules/account/stores/profile.ts`                                                                                                               |
| Attaching Bearer token to requests | `src/infrastructure/http/index.ts` (request interceptor)                                                                                              |
| Handling `401` responses           | `src/infrastructure/http/refresh.ts` (refresh and replay in `jwt` mode, end the session in `cookie` mode; a replay as a guest once the session ended) |
| Restoring auth on page reload      | `src/app/guards/authentications.ts` → `tryRestoreAuth`                                                                                                |
| Route guards                       | `src/app/guards/authentications.ts` → `canAccess`, `enforceRouteAccess`                                                                               |

## Route guards

A route declares its requirement once, on its own record; `enforceRouteAccess` runs globally in
`router.beforeEach` and applies `canAccess` to it. There is no `isAuth`/`isGuest` guard — one
predicate covers every case, and `AppNavigation` calls the same one to decide whether to show a
link, so a visible link can never bounce you.

The requirement has two halves, and they are ANDed:

| Field                         | Effect                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `meta.access` absent          | No standing required.                                                                                                               |
| `meta.access: 'auth'`         | Must be logged in. Redirects to `/login?continue=<current-path>` on failure.                                                        |
| `meta.access: 'guest'`        | Must NOT be logged in. Redirects to Home if already authenticated.                                                                  |
| `meta.access: 'open'`         | Anyone: a guest passes, and a signed-in visitor still has to hold `meta.can`. The cart's own (a guest has one, staff do not).       |
| `meta.can: [action, subject]` | Must hold that rule. Redirects to Home on failure — logging in again cannot grant a permission, so no `continue` target is offered. |

**There is no `admin` level, and that is the point.** A screen names the permission it needs —
`['update', 'Product']`, `['read', 'User']` — and the answer comes from the rules the API
published for this caller at the `abilities` of `GET /account`, which are the same rules the server
enforces. A ladder of role names cannot express the model behind it: `warehouse` may move stock and
not answer a message, `support` may answer a message and not move stock — neither is "more
privileged" than the other — and the boolean that used to stand in for all of it could not say
_administrator of what_.

A rule always implies a session — rules are published for a caller the server identified — so a
stranger is refused before the abilities are consulted at all.

The rules ride on answers the client already makes, never on a call of their own: the sign-in answer
(`account.abilities`), `GET /account` after a reload, and the refresh answer. After a `403` the
interceptor re-reads `GET /account` (single flight, sent passive) and the store bumps
`abilitiesSignal`, so a role taken away shows without a reload.

Every refusal notifies the visitor — silently bouncing someone reads as a broken link.

`tryRestoreAuth` runs first in the same `beforeEach` and silently restores the token (via the
refresh endpoint, gated on the `isAuth` cookie), then the viewer, then the rules that go with
them. This ensures public pages (e.g. `ProductsList`) render staff controls correctly after a hard
reload.

### The two scopes

the `abilities` of `GET /account` answers **two** rule lists, and the store keeps them as two abilities:

| Ability           | What it covers                                                      | Who has any                                         |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| `tenantAbility`   | this shop — products, orders, users, locales, webhooks, credentials | everyone, down to the `guest` role a stranger holds |
| `platformAbility` | the installation — health, metrics, the operational audit           | a platform operator, and nobody else                |

They are never merged. A tenant rule can never satisfy a platform key and the reverse is equally
impossible, so `session.can(action, subject)` asks each in turn: a subject is declared in exactly
one scope, so at most one of them can answer yes. That is what lets the observability dashboard be
gated on `['read', 'ObservabilitySnapshot']` like any other screen, instead of on a shop key that
merely correlated with it.

::: warning The client's copy has no authority
It decides what to RENDER, never what is allowed. Every request is re-evaluated server-side. An
empty ability — before the fetch lands, or after it fails — is the least-privileged answer, so a
slow network greys things out rather than opening them.
:::

## Interceptor error handling

The interceptors redirect nothing. A `401` ends the session or is answered in place (a refresh, then a
step-up prompt); the route guards decide where a signed-out visitor goes. A `403` is shown as a
"forbidden" message, never as a server error. A `5xx` is reported to Grafana Faro through
`captureException()` and shown where the call site chose to show it (a toast or an in-place alert).

## Security properties provided

- **Bearer transport**: access token is not auto-attached by the browser; every protected request must explicitly include it.
- **HttpOnly refresh cookie**: the refresh token is inaccessible to JavaScript, reducing XSS exposure.
- **`sameSite=lax`** (set by backend): reduces cross-site cookie sending in common CSRF scenarios.
- **No PII in the trackers**: the browser never identifies the visitor to Faro or Umami (`setUser` and `identify` are never called), so neither the email nor the account id leaves it through them.

## The human-challenge widget (rung 3)

The backend's antibot rung is off by default (`NODE_ANTIBOT_PROVIDER=none`) but an operator can
turn it on. Once on, `POST /account/signup`, `POST /account/password/reset` and `POST /tasks`
always require an `antibot-challenge-token` header; `POST /account/login` and
`POST /payments/:id/confirm` only require it after a prior failure — see
`boilerplate-node-backend/docs/modules/antibot.md`.

`src/ui/organisms/HumanCheck.vue` is the one provider-neutral component every gated form mounts:

```mermaid
flowchart TD
    A[HumanCheck mounts] --> B[GET /config]
    B -->|provider: none| C[Renders nothing]
    B -->|provider: altcha| D[altcha-widget web component]
    B -->|provider: turnstile| E[Cloudflare vendor script + render]
    D --> F[Solved token exposed as .token]
    E --> F
    F --> G["Hosting form: withAntibotToken(token, options)"]
    G --> H[antibot-challenge-token header on submit]
```

| Concern                                       | File                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The widget itself                             | `src/ui/organisms/HumanCheck.vue`                                                                         |
| Header attach + 403 detection                 | `src/infrastructure/http/antibot.ts`                                                                      |
| Always-guarded forms (signup, reset, contact) | Mount `<HumanCheck>` unconditionally                                                                      |
| Conditionally-guarded forms (login, payment)  | Mount `<HumanCheck>` only after `ANTIBOT_VERIFICATION_FAILED`, then let the visitor retry the same submit |

**Why `altcha` is the one npm dependency.** It is the official web component for the backend's
self-hosted `altcha` provider — same project family as the backend's `altcha-lib` — MIT-licensed,
actively maintained, and typed. Its `Challenge`/`ChallengeParameters` types match the backend's
`AntibotChallenge` contract schema field-for-field, so `HumanCheck.vue` fetches a challenge through
the generated client and hands it straight to the widget's `.configure()`, no translation layer.
**Turnstile gets no wrapper**: it is one vendor `<script>` tag and one `window.turnstile.render()`
call, not worth a dependency — see `docs/reference/package-dependencies.md`.

## External references

- [OWASP SPA Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

## Related pages

- [Sitemap & Access Control](./sitemap.md)
- [Request Flow](./request-flow.md)
- [State & Routing](./state-and-routing.md)
