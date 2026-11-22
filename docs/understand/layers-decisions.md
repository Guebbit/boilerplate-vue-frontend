---
type: concept
audience: [developer]
---

# Layers: decisions the source does not argue

Part of [Layers](./layers.md): the decisions that no source file states for itself.

## Decisions the source files do not argue

### The session store is not the account module

`infrastructure/http` reads the access token on every request and the router guards read `isAuth`
and the caller's own rules before any domain code runs — both are the bottom of the stack. The _user record_ — the
editable `User`, its email, its avatar, the endpoints that change it — is domain knowledge and
lives in `src/modules/account`.

One store for both would give `infrastructure` a `User` entity and make the app shell reach into a
domain to render a name. So the session holds a deliberately minimal projection instead:

```ts
viewer = { id, email, role, imageUrl, thumbnailUrl, verified };
```

The shell knows _someone is signed in, here is their display name and picture, here is their role
and whether their address is verified_. It does not know what a `User` is, and deleting the account
module does not break it.

Which `/account` calls belong to the session: the ones it needs to restore, remember or end
**itself** — `GET /account` (who am I), `/account/refresh`, `/account/logout`, `/account/sessions`,
and the language preference write. Everything else under `/account` — signup, the password resets,
the deletion flow, editing your own record — is an operation _on_ an account rather than _on_ the
session, and belongs to the module.

### Each repository owns its own dictionary

The two repos synchronize the _choice_ of language — that is what `Accept-Language` does — and
nothing else. Neither depends on the other for its own strings, which is what lets either
boilerplate be recombined with a different counterpart.

The API's own copy never reaches this app. It resolves its own keys and puts finished text on the
wire, so a response arrives already translated and the client prints what it was sent. There is no
reserved `api.*` namespace holding the API's dictionary. The one case that needs this app's own
words — no response at all, a 401 with an empty body, a bare 502 — reads `api-errors.*` in this
app's dictionary, translatable for every language, including the ones this build does not bundle.

### Locales: files are defaults, the database overrides them

The decision is that bundled files are the floor and the API's rows are merged on top, per key, and that the app stays usable when the API is slow or absent. The mechanics (the deep merge, which languages exist, why no env list) are in [Internationalisation](./i18n.md#files-are-defaults-the-database-overrides-them).

## Read next

- [Layers](./layers.md)
