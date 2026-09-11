# webhooks

::: tip At a glance
**Owns** — subscription administration (list/create/detail/edit/delete, secret rotation) and the delivery log (filtered read, replay).
**Depends on** — nothing. No sibling module's store or schema is imported.
**Breaks if you change** — nothing outside this folder. It is designed to be deleted.
:::

| Fact                    | This module                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Subdomain**           | `supporting` — Specific to this business but not a differentiator. Kept plain.               |
| **Screens**             | 5 — `WebhooksList` · `WebhookCreate` · `WebhookTarget` · `WebhookEdit` · `WebhookDeliveries` |
| **Store**               | `webhooks`                                                                                   |
| **Menu entries**        | `WebhooksList` · `WebhookDeliveries`                                                         |
| **API calls**           | 7                                                                                            |
| **Depends on**          | _nothing_                                                                                    |
| **Depended on by**      | _nothing_                                                                                    |
| **Languages**           | `en` · `it`                                                                                  |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                                           |
| **Backend counterpart** | `webhooks` in `boilerplate-node-backend`                                                     |

## The map

`webhooks` sits on no edge of the context map — nothing imports it and it imports nothing.

## The story

Five screens over one backend module, split by what they need rather than by CRUD verb alone:
subscriptions get the usual four (list, create, a read-only detail page, a plain field-edit form),
and the delivery log gets a fifth of its own.

**The delivery log is a route, not a tab, on purpose.** It is read-only and unrelated to the
subscription CRUD form's own state, and — the actual reason — its `subscriptionId`/`status`
filters are mirrored into the URL query string, so "failed deliveries for subscription X" is a
link a support conversation can share or bookmark. A tab's state in this codebase is a local
`ref`, gone on reload; that would not survive being handed to someone else.

**There is no `GET /webhooks/subscriptions/{id}` on the backend**, and no equivalent for a single
delivery — both the subscription detail/edit pages and the delivery log hydrate from whatever the
store's own cache already holds (`fetchAllSubscriptions`/the paginated search), never a per-id
fetch. `store.ts`'s `watchSubscription` exists specifically because the toolkit's own `watchOne`
needs a `get` operation this API does not have.

**The secret ring gets its own hand-written store actions, not the generic `createOne`/
`updateOne`.** Creating a subscription and rotating its secret both receive a plaintext secret in
the response, meant to be shown exactly once (`WebhookSecretRevealModal.vue`, modeled on the
two-factor backup-codes screen). The toolkit's generic create/update path caches whatever the API
call resolves to, verbatim — which would leave that plaintext sitting in this store's reactive
state indefinitely, readable by anything with `getRecord(id)`. `createSubscription` and
`rotateSecret` instead run the call through `fetchAny` (no automatic caching), strip the secret
field by hand, and cache the rest — while still returning the full response, secret included, to
the view that needs it for the one-time reveal. `tests/store.spec.ts` asserts this directly: after
either call, the plaintext never appears anywhere in `JSON.stringify(store.subscriptions)`.

::: tip Deleting this module
Nothing outside `src/modules/webhooks/` references it — no store, no schema, no component. `rm -rf`
the folder and its line in `src/modules.ts`; the backend module is unaffected, since this client
never wrote to it beyond what any HTTP client could.
:::

## State

Store `webhooks`, from `store.ts` — two `useStructureCrudApi` instances (subscriptions,
deliveries) plus the event catalogue, behind one `defineStore`. Only what the setup function
returns is listed — an internal ref is not part of the surface.

| Kind        | Members                                                                                                                                                                                                                                                                                                              | What it is                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **State**   | `subscriptions` · `selectedSubscriptionId` · `subscriptionFilters` · `subscriptionPageCurrent` · `subscriptionPageSize` · `deliveries` · `deliveryFilters` · `deliveryPageCurrent` · `deliveryPageSize`                                                                                                              | The refs the setup function returns — the only writable surface. |
| **Getters** | `subscriptionsList` · `currentSubscription` · `loadingSubscriptions` · `subscriptionsPageTotal` · `subscriptionPageItemList` · `deliveriesList` · `loadingDeliveries` · `deliveriesPageTotal` · `deliveryPageItemList` · `deliveriesTotalItems` · `eventCatalogue` · `loadingEventCatalogue` · `errorEventCatalogue` | Computed, derived from state. Read-only by construction.         |
| **Actions** | `getSubscription` · `fetchAllSubscriptions` · `watchSubscriptionsSearch` · `watchSubscription` · `createSubscription` · `updateSubscription` · `deleteSubscription` · `rotateSecret` · `removeSecret` · `watchDeliveriesSearch` · `replayDelivery` · `fetchEventCatalogue`                                           | Everything that changes state or calls the API.                  |

## Screens

| Path                              | Route name          | Access | Permission                 | View                          |
| --------------------------------- | ------------------- | ------ | -------------------------- | ----------------------------- |
| `webhooks/subscriptions`          | `WebhooksList`      | `auth` | `read WebhookSubscription` | `views/WebhooksList.vue`      |
| `webhooks/subscriptions/create`   | `WebhookCreate`     | `auth` | `read WebhookSubscription` | `views/WebhookCreate.vue`     |
| `webhooks/subscriptions/:id`      | `WebhookTarget`     | `auth` | `read WebhookSubscription` | `views/WebhookTarget.vue`     |
| `webhooks/subscriptions/:id/edit` | `WebhookEdit`       | `auth` | `read WebhookSubscription` | `views/WebhookEdit.vue`       |
| `webhooks/deliveries`             | `WebhookDeliveries` | `auth` | `read WebhookSubscription` | `views/WebhookDeliveries.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` (the standing it needs) and **Permission** its `meta.can` — the `[action, subject]` rule checked against the caller's own rules from `GET /account/abilities`. A menu entry restates neither, which is what keeps the menu and the router from disagreeing. See [Security](../tools/security.md#route-guards).

## Wiring

#### Endpoints called

| Call                                    | Response envelope                   |
| --------------------------------------- | ----------------------------------- |
| `GET /webhooks/subscriptions`           | `ListWebhookSubscriptionsResponse`  |
| `POST /webhooks/subscriptions`          | `CreateWebhookSubscriptionResponse` |
| `PATCH /webhooks/subscriptions/{id}`    | `UpdateWebhookSubscriptionResponse` |
| `DELETE /webhooks/subscriptions/{id}`   | `DeleteWebhookSubscriptionResponse` |
| `GET /webhooks/deliveries`              | `ListWebhookDeliveriesResponse`     |
| `POST /webhooks/deliveries/{id}/replay` | `ReplayWebhookDeliveryResponse`     |
| `GET /webhooks/events`                  | `ListWebhookEventsResponse`         |

Each row registers one Zod envelope through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.

#### Navigation entries

| Route | Label key | Section | Order | Icon | Badge |
| ------------------- | ------------------------------------- | --- | --- | --- | --- | --- |
| `WebhooksList` | `navigation.label-webhooks` | `admin` | 48 | yes | — |
| `WebhookDeliveries` | `navigation.label-webhook-deliveries` | `admin` | 49 | yes | — |

Two entries from one manifest — the same split the `feedback` module uses for its public form vs. its admin inbox: subscriptions and the delivery log are different jobs an operator reaches for at different times.

## Files

| File                                      | What it is                                                                                                                                                  | Explained in                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `components/WebhookDeliveriesFilters.vue` | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `components/WebhookSecretRevealModal.vue` | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `locales/en.json`                         | This domain's translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `locales/it.json`                         | This domain's translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `module.ts`                               | The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales. | [read](../theory/modules.md)          |
| `response-schemas.ts`                     | One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.                          | [read](../api/openapi-workflow.md)    |
| `routes.ts`                               | The domain's route records, spliced into the localised route tree. Each carries its own `meta.access`.                                                      | [read](../theory/sitemap.md)          |
| `schemas.ts`                              | Form schemas for this domain — the `https://` rule and the event-types minimum, neither of which the generated schema expresses as a bound constant.        | [read](../api/openapi-workflow.md)    |
| `store.ts`                                | The Pinia store: this domain's state, and every call it makes to the generated client.                                                                      | [read](../tools/state-and-routing.md) |
| `types.ts`                                | View-only shapes — the delivery filter bar's state — not part of the generated contract.                                                                    | [read](../theory/layers.md)           |
| `tests/e2e/a11y.cy.ts`                    | Cypress accessibility sweep — an axe run over this domain's routes, at each authentication level.                                                           | [read](../tools/component-testing.md) |
| `tests/routes.spec.ts`                    | Vitest suite — the route records and the `meta.access` each one declares.                                                                                   | [read](../tools/unit-testing.md)      |
| `tests/schemas-i18n.spec.ts`              | Vitest suite — the `schemas-i18n` validation rules.                                                                                                         | [read](../tools/unit-testing.md)      |
| `tests/schemas.spec.ts`                   | Vitest suite — the `schemas` validation rules.                                                                                                              | [read](../tools/unit-testing.md)      |
| `tests/store.spec.ts`                     | Vitest suite — this domain's store, with the transport mocked, including that a rotated/minted secret never lands in cached state.                          | [read](../tools/unit-testing.md)      |
| `views/WebhookCreate.vue`                 | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/WebhookDeliveries.vue`             | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/WebhookEdit.vue`                   | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/WebhookTarget.vue`                 | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/WebhooksList.vue`                  | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |

## Working on it

| Suite   | Files | Where                             |
| ------- | ----- | --------------------------------- |
| Vitest  | 4     | `src/modules/webhooks/tests/`     |
| Cypress | 1     | `src/modules/webhooks/tests/e2e/` |

```bash
# this module's vitest suites
npm run test:unit -- webhooks

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/webhooks/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own — the story above is the whole of it.

## Related pages

- [`feedback`](./feedback.md) — the other module with two navigation entries from one manifest
- [OpenAPI Workflow](../api/openapi-workflow.md) — where the generated request schemas come from
- [Sitemap & Access Control](../theory/sitemap.md) — the `admin` gate on every route here
- [State & Routing](../tools/state-and-routing.md) — the store behind the five screens
