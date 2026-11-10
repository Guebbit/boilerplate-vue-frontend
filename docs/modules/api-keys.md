# api-keys

::: tip At a glance
**Owns** — machine-to-machine credential administration: list (with revoke) and mint. No edit, no
detail page — a credential's fields are fixed at mint time.
**Depends on** — nothing. No sibling module's store or schema is imported.
**Breaks if you change** — nothing outside this folder. It is designed to be deleted.
:::

| Fact          | This module                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| **Subdomain** | `generic` — machine credential management is a solved problem, not a business differentiator |

## The map

`api-keys` sits on no edge of the context map — nothing imports it and it imports nothing.

## The story

Two screens over three endpoints — smaller than webhooks, because there is no `PATCH`: a
credential's name, permissions and expiry are fixed at mint time, so there is nothing to edit and
no detail page either, since the nine flat fields all fit a list row.

**Minting asks for a fresh session and an expiry.** `POST /api-keys` is a critical step-up, so the
shared [reauth prompt](./account.md) opens before the mint goes through; the form requires an
expiry (at most one year ahead, the same bound the server enforces), because a key that never
expires never gets rotated. The server also revokes a person's keys when they log out everywhere
or reset their password, which shows up here as `Revoked` rows.

**Only `admin` holds `apikeys.*` today**, through its declared superset of every tenant key — no
preset role names an `apikeys` key outright, and there is no wildcard of any kind. `meta.can`
gates both routes on the rule, the same way every other screen in this app does, so the nav entry
and both routes simply disappear for anyone else; nothing here hardcodes a role name.

**The permissions field is free text, not a picker.** the `abilities` of `GET /account` publish CASL
packed rules (`[action, subject]`, wildcards expanded) — but not the permission KEY strings themselves (`display:Product`), which are
`<family>.<breadth>.<action>` triples this repo has no source for. A `v-combobox` (multiple,
chips, no fixed `:items`) is the honest V1; a `422` naming the refused keys (`details.permissions`) lands on the
field directly rather than as a toast.

**The secret-reveal modal is shared with `webhooks`, not copied.** Minting a credential returns a
plaintext secret exactly once, the same shape webhooks' subscription-create/rotate flow already
had — `src/ui/organisms/SecretRevealModal.vue` is the module-agnostic reveal dialog both modules
share, with `title`/`intro` as overridable props.

::: tip Deleting this module
Nothing outside `src/modules/api-keys/` references it — no store, no schema, no component beyond
the shared `SecretRevealModal`, which webhooks also uses and keeps regardless. `rm -rf` the folder
and its line in `src/modules.ts`; the backend module is unaffected.
:::

## State

State, getters and actions are exactly what the setup function of each store returns: `src/modules/api-keys/store.ts`.

Store `api-keys`, from `store.ts` — one `useStructureCrudApi` instance (search only; there is no
`get`/`update`, and no filters beyond pagination) behind one `defineStore`. Only what the setup
function returns is listed — an internal ref is not part of the surface.

## Screens

Paths, route names, access and permission per screen: `src/modules/api-keys/routes.ts`; every module's together are in the generated [sitemap](../theory/sitemap.md).

## Wiring

#### Endpoints called

Method, path pattern, response schema and owning module of every operation: `contracts/rest/routes.ts` (rows with `module: 'api-keys'`). Auth is in the backend contract.

#### Navigation entries

Entries are declared in `src/modules/api-keys/module.ts`.

## Files

The folder is `src/modules/api-keys/`; each file's own `@module` header says what it is.

## Working on it

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
