# users

::: tip At a glance
**Owns** — user administration: the list, detail, create and edit screens, each behind the
`users.*` rule it needs.
**Depends on** — nothing. A user record exists whether or not anyone is signed in.
**Breaks if you change** — `schemas.ts`. [`account`](./account.md) validates every one of its forms against it.
:::

| Fact          | This module                                                         |
| ------------- | ------------------------------------------------------------------- |
| **Subdomain** | `generic` — A solved problem. Modelling effort here would be waste. |
| **Publishes** | `usersPasswordSchema` · `usersSchema`                               |

## The map

The context map is drawn once, in [the whole map](./index.md#the-whole-map).

- `account` → **published-language** — Validates every form against `usersSchema`/`usersPasswordSchema` — shared field rules, not a shared store.

## The story

Admin screens over one collection, and a barrel that exists for one reason: the field rules.

`usersSchema` and `usersPasswordSchema` are built on the **generated** request schemas rather than
hand-written beside them, so _what makes a valid username_ comes from `openapi.yaml` and cannot
drift from what the server will accept. [`account`](./account.md) imports both, which is why the
arrow points `account → users` and not the reverse.

::: tip The direction is the point
It is the account module that reads this one, not the other way round. A user record exists whether
or not anyone is signed in, so this module depends on nothing — and deleting
[`account`](./account.md) leaves these screens working, while deleting this one leaves that module
validating nothing.
:::

Every screen here declares the `users.*` rule it needs — `read` to list or view, `create` to add,
`update` to edit — so a `support` role that may update an account and not create one gets exactly
the screens it can use. The equivalent self-service actions — profile read, account deletion —
live under [`account`](./account.md). The two never share a screen.

Every role picker (`UserCreate`, `UserEdit`, `UserAccessDialog`) is built from `grantableRoles`, which the `abilities` of `GET /account` publishes: the roles the signed-in caller may assign, computed by the same rule as the `409` the write answers. There is no role list in this repo to drift. The select adds the account's current role so it can still show it, and it is disabled (create: hidden) when the caller may assign none.

`users/create` is declared before `users/:id` for the same reason the products routes are: vue-router
would rank it correctly either way, and a reader should not have to know that.

**Every button follows the row's `actions`**, the server's one flag per endpoint (`update`,
`assignRole`, `revokeRole`, `delete`, `hardDelete`, `restore`, `placePurchaseHold`, `liftPurchaseHold`, `activate`,
`deactivate`), already counting the caller's keys, the protection of staff accounts and the row's own
state. `UsersList` reads `restore` and `hardDelete` instead of deriving them from `deletedAt`;
`UserAccessDialog` offers the role on `assignRole` (own account included: no rule refuses it) and the
status on whichever of `activate` / `deactivate` fits. A row with a `purgeAt` is an account its owner
asked to delete: it carries an "Erases on {date}" chip, and its Restore asks for a confirmation first
(erasure is the owner's right under the GDPR; restore only when they asked staff to), while a plain
soft delete keeps the one-click restore. `restore` is false once `purgeAt` has passed. Neither the role nor the status is a field of the edit `PATCH`:
`UserEdit` has an Activate and a Deactivate button, saves the profile first and then calls the role door
(`POST /users/{id}/assign-role`, or `revoke-role` for "no staff role"), and the store's `applyAccessChange` turns a
confirmed role/status choice into those door calls and an `activate` / `deactivate` call. An account
holding no role has nothing for `revoke-role` to take, and the role in force is never sent again (it would
answer `409 USER_ROLE_ALREADY_ASSIGNED`). `/account` is a
different schema, `Account`, with no `actions`.

`UserTarget` also pauses and resumes an account's checkout (the **purchase hold**, `ban:User`): "Pause
checkout" opens `UserPurchaseHoldDialog` (an end date and a note the buyer reads), "Lift the hold" acts at
once (a toast says what happened) and doubles as the staff review. The list filters by it (`purchaseHold`, `true` only) and marks
the rows. The buyer's side is `account`'s `PurchaseHoldNotice`, mounted by the cart.

## State

State, getters and actions are exactly what the setup function of each store returns: `src/modules/users/store.ts`. Beside the main store, `badge-store.ts` holds the nav badge's number (the review list's total).

The list answers a `UserListItem`, not the whole account: the table's fields, and the full record comes
from the audited detail read. The list view reads with `partial: true`, so a row merges over a full
account the store already holds instead of replacing it, and the detail page still reads the whole
record.

## Screens

Paths, route names, access and permission per screen: `src/modules/users/routes.ts`; every module's together are in the generated [sitemap](../theory/sitemap.md).

## Wiring

#### Endpoints called

Method, path pattern, response schema and owning module of every operation: `contracts/rest/routes.ts` (rows with `module: 'users'`). Auth is in the backend contract.

#### Navigation entries

Entries are declared in `src/modules/users/module.ts`. Badges: `UsersList` — live accounts flagged for review (its own list total).

## Files

The folder is `src/modules/users/`; each file's own `@module` header says what it is.

## Working on it

```bash
# this module's vitest suites
npm run test:unit -- users

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/users/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own — the story above is the whole of it.

## Related pages

- [`account`](./account.md) — the module that imports the field rules
- [OpenAPI Workflow](../api/openapi-workflow.md) — where the generated request schemas come from
- [Sitemap & Access Control](../theory/sitemap.md) — the `admin` gate on every route here
- [State & Routing](../tools/state-and-routing.md) — the store behind the four screens
