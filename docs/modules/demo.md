# demo

::: tip At a glance
**Owns** — the boilerplate's own showroom: one page exercising the toolkit, the toasts and provide/inject.
**Depends on** — nothing, and nothing depends on it. It exists to be deleted.
**Breaks if you change** — nothing. That is the entire design.
:::

<!-- gen:identity:start -->

| Fact                    | This module                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Subdomain**           | `generic` — A solved problem. Modelling effort here would be waste.                                                                              |
| **Screens**             | 1 — `Playground`                                                                                                                                 |
| **Store**               | `counter`                                                                                                                                        |
| **Menu entries**        | `Playground`                                                                                                                                     |
| **API calls**           | _none_                                                                                                                                           |
| **Depends on**          | _nothing_                                                                                                                                        |
| **Depended on by**      | _nothing_                                                                                                                                        |
| **Languages**           | `en` · `it`                                                                                                                                      |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                                                                                               |
| **Backend counterpart** | _none_ — A client-side showcase of the shared UI kit. It pairs with the demo profile and the seeded dataset rather than with any backend domain. |

::: info Stands alone
No module depends on this one and it depends on none. Deleting the folder and its line in `src/modules.ts` costs nothing else.
:::

<!-- gen:identity:end -->

## The map

<!-- gen:map:start -->

`demo` sits on no edge of the context map — nothing imports it and it imports nothing.

<!-- gen:map:end -->

## The story

One page exercising the store, the toolkit components, the notification toasts, the provide/inject
pattern and a teaching route guard.

**It is a module rather than part of the app shell, and that is the whole point.** As part of the
shell it would be woven into files a real project has to keep. As a module it is `rm -rf` plus one
line of `src/modules.ts`, and the demo leaves with it.

::: tip The only module with no backend counterpart at all
Every other domain here answers a backend module. This one pairs with the demo profile and the
seeded dataset instead — it demonstrates the client's own furniture, and there is nothing on the
server for it to demonstrate.
:::

Two files exist here and nowhere else:

| File          | What it is                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------ |
| `guards.ts`   | The teaching route guard — a worked example of the pattern, kept out of a production build |
| `provided.ts` | The sample data the showcase renders, so no screen invents its own inline                  |

The store is called `counter`, which is not a naming slip: it is the smallest possible store, and its
job is to be read while someone learns what a store is.

## State

<!-- gen:state:start -->

Store `counter`, from `store.ts`. Only what the setup function returns is listed — an internal ref is not part of the surface.

| Kind        | Members                          | What it is                                                       |
| ----------- | -------------------------------- | ---------------------------------------------------------------- |
| **State**   | `count`                          | The refs the setup function returns — the only writable surface. |
| **Getters** | `doubleCount`                    | Computed, derived from state. Read-only by construction.         |
| **Actions** | `increment` · `incrementDelayed` | Everything that changes state or calls the API.                  |

<!-- gen:state:end -->

## Screens

<!-- gen:screens:start -->

| Path         | Route name   | Access   | View                   |
| ------------ | ------------ | -------- | ---------------------- |
| `playground` | `Playground` | `public` | `views/Playground.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` — a menu entry never restates it, which is what keeps the menu and the router from disagreeing.

<!-- gen:screens:end -->

## Wiring

<!-- gen:wiring:start -->

#### Navigation entries

| Route        | Label key                     | Order | Badge |
| ------------ | ----------------------------- | ----- | ----- |
| `Playground` | `navigation.label-playground` | 20    | —     |

<!-- gen:wiring:end -->

## Files

<!-- gen:files:start -->

| File                                  | What it is                                                                                                                                                  | Explained in                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `components/ProvidedVariableCard.vue` | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `guards.ts`                           | `demo` only. The route guards that keep the showcase out of a production build.                                                                             | [read](../theory/sitemap.md)          |
| `locales/en.json`                     | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `locales/it.json`                     | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `module.ts`                           | The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales. | [read](../theory/modules.md)          |
| `provided.ts`                         | `demo` only. The sample data the showcase renders, so no screen invents its own.                                                                            | [read](../tools/demo-profile.md)      |
| `routes.ts`                           | The domain’s route records, spliced into the localised route tree. Each carries its own `meta.access`.                                                      | [read](../theory/sitemap.md)          |
| `store.ts`                            | The Pinia store: this domain’s state, and every call it makes to the generated client.                                                                      | [read](../tools/state-and-routing.md) |
| `tests/e2e/a11y.cy.ts`                | Cypress suite — the screens, in a browser.                                                                                                                  | [read](../tools/component-testing.md) |
| `tests/guards.spec.ts`                | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `tests/routes.spec.ts`                | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `tests/store.spec.ts`                 | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `views/Playground.vue`                | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |

<!-- gen:files:end -->

## Working on it

<!-- gen:working:start -->

| Suite   | Files | Where                         |
| ------- | ----- | ----------------------------- |
| Vitest  | 3     | `src/modules/demo/tests/`     |
| Cypress | 1     | `src/modules/demo/tests/e2e/` |

```bash
# this module's vitest suites
npm run test:unit -- demo

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/demo/tests/e2e/*.cy.ts'
```

<!-- gen:working:end -->

## Deeper in

<!-- gen:subpages:start -->

Nothing in this domain needs a page of its own — the story above is the whole of it.

<!-- gen:subpages:end -->

## Related pages

- [Demo profile](../tools/demo-profile.md) — the seeded backend this page runs against
- [Adding & Removing a Module](../theory/module-lifecycle.md) — the deletability claim, at its cheapest
- [State & Routing](../tools/state-and-routing.md) — what the showcase demonstrates
- [Modules overview](./index.md) — the whole context map
