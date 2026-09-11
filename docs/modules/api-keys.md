# api-keys

::: tip At a glance
**Owns** — machine-to-machine credential administration: list (with revoke) and mint. No edit, no
detail page — a credential's fields are fixed at mint time.
**Depends on** — nothing. No sibling module's store or schema is imported.
**Breaks if you change** — nothing outside this folder. It is designed to be deleted.
:::

| Fact                    | This module                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Subdomain**           | `generic` — machine credential management is a solved problem, not a business differentiator |
| **Screens**             | 2 — `ApiKeysList` · `ApiKeyCreate`                                                           |
| **Store**               | `api-keys`                                                                                   |
| **Menu entries**        | `ApiKeysList`                                                                                |
| **API calls**           | 3                                                                                            |
| **Depends on**          | _nothing_                                                                                    |
| **Depended on by**      | _nothing_                                                                                    |
| **Languages**           | `en` · `it`                                                                                  |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                                           |
| **Backend counterpart** | `api-keys` in `boilerplate-node-backend`                                                     |

## The map

`api-keys` sits on no edge of the context map — nothing imports it and it imports nothing.

## The story

Two screens over three endpoints — smaller than webhooks, because there is no `PATCH`: a
credential's name, permissions and expiry are fixed at mint time, so there is nothing to edit and
no detail page either, since the nine flat fields all fit a list row.

**Only `owner` holds `apikeys.*` today**, through `all.manage` — no preset role names an
`apikeys` key outright. `meta.can` gates both routes on the rule, the same way every other screen
in this app does, so the nav entry and both routes simply disappear for anyone else; nothing here
hardcodes a role name.

**The permissions field is free text, not a picker.** `GET /account/abilities` publishes CASL
packed rules (`[action, subject]`, wildcards expanded) plus, as of this build, the full declared
`subjects` set — but not the permission KEY strings themselves (`products.read`), which are
`<family>.<action>` pairs this repo has no source for. A `v-combobox` (multiple, chips, no fixed
`:items`) is the honest V1; a `422` naming the refused keys (`details.permissions`) lands on the
field directly rather than as a toast.

**The secret-reveal modal is shared with `webhooks`, not copied.** Minting a credential returns a
plaintext secret exactly once, the same shape webhooks' subscription-create/rotate flow already
had — `src/ui/organisms/SecretRevealModal.vue` is the promoted, module-agnostic version of what
used to live only in `webhooks/components/`, with `title`/`intro` as overridable props.

::: tip Deleting this module
Nothing outside `src/modules/api-keys/` references it — no store, no schema, no component beyond
the shared `SecretRevealModal`, which webhooks also uses and keeps regardless. `rm -rf` the folder
and its line in `src/modules.ts`; the backend module is unaffected.
:::

## State

Store `api-keys`, from `store.ts` — one `useStructureCrudApi` instance (search only; there is no
`get`/`update`, and no filters beyond pagination) behind one `defineStore`. Only what the setup
function returns is listed — an internal ref is not part of the surface.

| Kind        | Members                                                      | What it is                                                       |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| **State**   | `apiKeys` · `filters` · `pageCurrent` · `pageSize`           | The refs the setup function returns — the only writable surface. |
| **Getters** | `apiKeysList` · `loading` · `pageTotal` · `pageItemList`     | Computed, derived from state. Read-only by construction.         |
| **Actions** | `watchApiKeysSearch` · `mintCredential` · `revokeCredential` | Everything that changes state or calls the API.                  |

## Screens

| Path              | Route name     | Access | Permission      | View                     |
| ----------------- | -------------- | ------ | --------------- | ------------------------ |
| `api-keys`        | `ApiKeysList`  | `auth` | `read ApiKey`   | `views/ApiKeysList.vue`  |
| `api-keys/create` | `ApiKeyCreate` | `auth` | `create ApiKey` | `views/ApiKeyCreate.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` (the standing it needs) and **Permission** its `meta.can` — the `[action, subject]` rule checked against the caller's own rules from `GET /account/abilities`. A menu entry restates neither, which is what keeps the menu and the router from disagreeing. See [Security](../tools/security.md#route-guards).

## Wiring

#### Endpoints called

| Call                    | Response envelope      |
| ----------------------- | ---------------------- |
| `GET /api-keys`         | `ListApiKeysResponse`  |
| `POST /api-keys`        | `MintApiKeyResponse`   |
| `DELETE /api-keys/{id}` | `RevokeApiKeyResponse` |

Each row registers one Zod envelope through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.

#### Navigation entries

| Route         | Label key                   | Section | Order | Icon | Badge |
| ------------- | --------------------------- | ------- | ----- | ---- | ----- |
| `ApiKeysList` | `navigation.label-api-keys` | `admin` | 51    | yes  | —     |

## Files

| File                         | What it is                                                                                                                                                  | Explained in                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `locales/en.json`            | This domain's translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `locales/it.json`            | This domain's translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `module.ts`                  | The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales. | [read](../theory/modules.md)          |
| `response-schemas.ts`        | One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.                          | [read](../api/openapi-workflow.md)    |
| `routes.ts`                  | The domain's route records, spliced into the localised route tree. Each carries its own `meta.access`.                                                      | [read](../theory/sitemap.md)          |
| `schemas.ts`                 | Form schemas for this domain — the name/permissions/expiry rules the generated schema does not express as bound constants beyond `name`'s own maximum.      | [read](../api/openapi-workflow.md)    |
| `store.ts`                   | The Pinia store: this domain's state, and every call it makes to the generated client.                                                                      | [read](../tools/state-and-routing.md) |
| `tests/e2e/a11y.cy.ts`       | Cypress accessibility sweep — an axe run over this domain's routes, at each authentication level.                                                           | [read](../tools/component-testing.md) |
| `tests/routes.spec.ts`       | Vitest suite — the route records and the `meta.access`/`meta.can` each one declares.                                                                        | [read](../tools/unit-testing.md)      |
| `tests/schemas-i18n.spec.ts` | Vitest suite — the `schemas-i18n` validation rules.                                                                                                         | [read](../tools/unit-testing.md)      |
| `tests/schemas.spec.ts`      | Vitest suite — the `schemas` validation rules.                                                                                                              | [read](../tools/unit-testing.md)      |
| `tests/store.spec.ts`        | Vitest suite — this domain's store, with the transport mocked, including that a minted secret never lands in cached state.                                  | [read](../tools/unit-testing.md)      |
| `views/ApiKeyCreate.vue`     | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/ApiKeysList.vue`      | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |

## Working on it

| Suite   | Files | Where                             |
| ------- | ----- | --------------------------------- |
| Vitest  | 4     | `src/modules/api-keys/tests/`     |
| Cypress | 1     | `src/modules/api-keys/tests/e2e/` |

```bash
# this module's vitest suites
npm run test:unit -- api-keys

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/api-keys/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own — the story above is the whole of it.

## Related pages

- [`webhooks`](./webhooks.md) — the module `SecretRevealModal.vue` was promoted out of, and the
  other module minting a one-time credential secret
- [OpenAPI Workflow](../api/openapi-workflow.md) — where the generated request schemas come from
- [Sitemap & Access Control](../theory/sitemap.md) — the `meta.can` gate on both routes here
- [State & Routing](../tools/state-and-routing.md) — the store behind the two screens
