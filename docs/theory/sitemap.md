# Sitemap & Access Control

All routes are locale-prefixed (`/:locale/…`). A missing locale is injected automatically by the `localeChoice` guard using `VITE_APP_DEFAULT_LOCALE`.

## Route table

| Route | Route name | Access |
| ----- | ---------- | ------ |
| `/:locale/` | `Home` | public |
| `/:locale/playground` | `Playground` | public (the `demo` module) |
| `/:locale/playground/realtime` | `RealtimePlayground` | admin |
| `/:locale/error/:status/:message?` | `Error` | public |
| `/:locale/login` | `Login` | guest only |
| `/:locale/signup` | `Signup` | guest only |
| `/:locale/password-reset` | `PasswordResetRequest` | guest only |
| `/:locale/password-reset/confirm` | `PasswordResetConfirm` | guest only |
| `/:locale/account-delete/confirm` | `AccountDeleteConfirm` | public |
| `/:locale/verify-email/confirm` | `VerifyEmailConfirm` | public |
| `/:locale/profile` | `Profile` | auth |
| `/:locale/logout` | `Logout` | public (redirects to Home) |
| `/:locale/products` | `ProductsList` | public |
| `/:locale/products/:id` | `ProductTarget` | public |
| `/:locale/products/:id/edit` | `ProductEdit` | admin |
| `/:locale/cart` | `Cart` | auth |
| `/:locale/wishlist` | `Wishlist` | auth |
| `/:locale/orders` | `OrdersList` | auth |
| `/:locale/orders/:id` | `OrderTarget` | auth |
| `/:locale/orders/:id/edit` | `OrderEdit` | admin |
| `/:locale/users` | `UsersList` | admin |
| `/:locale/users/create` | `UserCreate` | admin |
| `/:locale/users/:id` | `UserTarget` | admin |
| `/:locale/users/:id/edit` | `UserEdit` | admin |
| `/:locale/admin` | `Admin` | admin |
| `/:locale/contact` | `Contact` | public |
| `/:locale/feedback` | `FeedbackInbox` | admin |
| `/:locale/about` · `/faq` · `/terms` · `/privacy` | `StaticAbout` … | public |
| `/:locale/:catchAll(.*)` | — | redirect → `Error 404` |

**Access level legend:** a route declares its requirement as `meta.access`; absent means public.

- **public** — no `meta.access`, anyone can enter
- **guest only** — `meta.access: 'guest'`, logged-in users are redirected away (e.g. Login page)
- **auth** — `meta.access: 'auth'`, must be logged in
- **admin** — `meta.access: 'admin'`, must be logged in *and* admin; others are redirected to Home

There is no `isAuth`/`isGuest`/`isAdmin` guard: one predicate, `canAccess`, answers all three, and
one global guard, `enforceRouteAccess`, applies it. That is deliberate — `AppNavigation` calls the
same predicate to decide whether to *show* a link, so a visible link can never bounce you and a
reachable page can never be unlinkable.

## Navigation flow

Order is the router's, not this diagram's convenience: `beforeEach` (session, then access) runs
**before** `beforeResolve` (locale), so an unauthorised visitor is redirected before any dictionary
is fetched.

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 70, 'rankSpacing': 90}}}%%
flowchart TD
    Nav([Navigation]) --> Restore[tryRestoreAuth: token, then viewer]
    Restore --> Guard{meta.access?}

    Guard -->|absent — public| Locale

    Guard -->|guest| GuestCheck{Logged in?}
    GuestCheck -- yes --> GuestHome[Redirect → Home]
    GuestCheck -- no --> Locale

    Guard -->|auth| AuthCheck{Logged in?}
    AuthCheck -- no --> AuthLogin[Redirect → /login?continue=…]
    AuthCheck -- yes --> Locale

    Guard -->|admin| AdminCheck{Admin role?}
    AdminCheck -- no --> AdminHome[Redirect → Home]
    AdminCheck -- yes --> Locale

    Locale{Locale loaded?} -- no --> Inject[localeChoice: load or inject default]
    Inject --> View[Render view]
    Locale -- yes --> View

    classDef entry fill:#f0fdf4,stroke:#16a34a,color:#111827;
    classDef decision fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef guard fill:#ede9fe,stroke:#7c3aed,color:#111827;
    classDef success fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef redirect fill:#fee2e2,stroke:#dc2626,color:#111827;

    class Nav entry;
    class Guard,GuestCheck,AuthCheck,AdminCheck,Locale decision;
    class Restore,Inject guard;
    class View success;
    class GuestHome,AdminHome,AuthLogin redirect;
```

## Where guards live

| Guard | File | Registered on | Effect |
| ----- | ---- | ------------- | ------ |
| `tryRestoreAuth` | `src/app/guards/authentications.ts` | `beforeEach` (first) | Silently restores the access token from the refresh endpoint, then loads the viewer, so `isAuth`/`isAdmin` are settled before anything reads them |
| `enforceRouteAccess` | `src/app/guards/authentications.ts` | `beforeEach` (second) | Applies `canAccess` to `meta.access`; redirects and notifies the visitor when it refuses |
| `localeChoice` | `src/app/guards/localeChoice.ts` | `beforeResolve` | Loads and activates the `:locale` dictionary; redirects with the default locale injected when the param is missing or unsupported |
| `exampleGuard` | `src/modules/demo/guards.ts` | `beforeEnter` on `Playground` | Teaching-only: shows what a guard can and cannot reach. Scoped to one route, never app-wide |

`canAccess` in the same file is not a guard — it is the shared predicate both `enforceRouteAccess`
and `AppNavigation` call.

## Auth persistence

`tryRestoreAuth` runs in `router.beforeEach` on **every** navigation, not just guarded ones.
This ensures that public pages (e.g. `ProductsList`) still render the correct admin controls after a hard page reload, without requiring a separate protected route guard.

## Related pages

- [Request Flow](./request-flow.md)
- [Security](../tools/security.md)
- [State & Routing](../tools/state-and-routing.md)
