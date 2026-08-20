# locales

::: tip At a glance
**Owns** — the translation admin: which languages exist, and what has been edited into them.
**Depends on** — nothing. It talks only to `/locales/*`.
**Breaks if you change** — nothing outside this folder. Rendering never depended on it.
:::

<!-- gen:identity:start -->

| Fact                    | This module                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| **Subdomain**           | `generic` — A solved problem. Modelling effort here would be waste. |
| **Screens**             | 2 — `LocalesList` · `LocaleEntries`                                 |
| **Store**               | `locales`                                                           |
| **Menu entries**        | `LocalesList`                                                       |
| **API calls**           | 9                                                                   |
| **Depends on**          | _nothing_                                                           |
| **Depended on by**      | _nothing_                                                           |
| **Languages**           | `en` · `it`                                                         |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                  |
| **Backend counterpart** | `locales` in `boilerplate-node-backend`                             |

::: info Stands alone
No module depends on this one and it depends on none. Deleting the folder and its line in `src/modules.ts` costs nothing else.
:::

<!-- gen:identity:end -->

## The map

<!-- gen:map:start -->

`locales` sits on no edge of the context map — nothing imports it and it imports nothing.

<!-- gen:map:end -->

## The story

This module is the **author** half of a two-half feature, and reading it without that split is how
you misunderstand it.

The **consumer** half lives in `infrastructure/i18n/locale-overrides.ts` and needs no module at all:
every visitor's locale switch reads it, on every page, whether or not anyone can edit a translation.
This module is the screens a translator edits _through_.

::: tip What deleting this module costs, precisely
The two admin screens. **Every language already translated keeps rendering**, because rendering never
depended on this folder.

The two reads it shares with the boot path — `GET /locales` and `GET /locales/{tag}/messages` — stay
registered by `infrastructure` precisely so this folder can be `rm -rf`ed without touching them. That
is not a coincidence in the layering; it is the layering doing its job.
:::

`dictionaries.ts` is this module's one-off: the merge that layers server rows over what the app
bundles, key by key. An unedited key keeps its bundled text, and a language the client does not ship
at all falls back per key for whatever nobody has translated yet.

The trap worth carrying over from the server: a language existing in the database does **not** mean
the API can answer in it. `GET /locales` reports scopes per language rather than a bare list of tags,
so _may I request this language_ and _may I download a dictionary for it_ stay two questions.

## State

<!-- gen:state:start -->

Store `locales`, from `store.ts`. Only what the setup function returns is listed — an internal ref is not part of the surface.

| Kind        | Members                                                                                                                                                                         | What it is                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **State**   | `capabilities` · `defaultLocale` · `fallbackLocale` · `filters` · `pageCurrent` · `pageSize`                                                                                    | The refs the setup function returns — the only writable surface. |
| **Getters** | `loading` · `pageTotal` · `pageItemList`                                                                                                                                        | Computed, derived from state. Read-only by construction.         |
| **Actions** | `fetchLanguages` · `createLanguage` · `editLanguage` · `removeLanguage` · `watchSearchEntries` · `addEntry` · `editEntry` · `removeEntry` · `importEntries` · `fetchAllEntries` | Everything that changes state or calls the API.                  |

<!-- gen:state:end -->

## Screens

<!-- gen:screens:start -->

| Path           | Route name      | Access  | View                      |
| -------------- | --------------- | ------- | ------------------------- |
| `locales`      | `LocalesList`   | `admin` | `views/LocalesList.vue`   |
| `locales/:tag` | `LocaleEntries` | `admin` | `views/LocaleEntries.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` — a menu entry never restates it, which is what keeps the menu and the router from disagreeing.

<!-- gen:screens:end -->

## Wiring

<!-- gen:wiring:start -->

#### Endpoints called

| Call                                | Response envelope              |
| ----------------------------------- | ------------------------------ |
| `POST /locales`                     | `CreateLocaleResponse`         |
| `DELETE /locales/{id}`              | `DeleteLocaleResponse`         |
| `PUT /locales/{id}`                 | `UpdateLocaleResponse`         |
| `PATCH /locales/{id}/entries`       | `MergeLocaleEntriesResponse`   |
| `POST /locales/{id}/entries`        | `CreateLocaleEntryResponse`    |
| `PUT /locales/{id}/entries`         | `ReplaceLocaleEntriesResponse` |
| `GET /locales/{id}/entries(\?.*)?`  | `ListLocaleEntriesResponse`    |
| `DELETE /locales/{id}/entries/{id}` | `DeleteLocaleEntryResponse`    |
| `PUT /locales/{id}/entries/{id}`    | `UpdateLocaleEntryResponse`    |

Each row registers one Zod envelope through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.

#### Navigation entries

| Route         | Label key                  | Order | Badge |
| ------------- | -------------------------- | ----- | ----- |
| `LocalesList` | `navigation.label-locales` | 43    | —     |

<!-- gen:wiring:end -->

## Files

<!-- gen:files:start -->

| File                                         | What it is                                                                                                                                                  | Explained in                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `components/EntriesImportDialog.vue`         | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `components/EntryFormDialog.vue`             | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `components/LanguageFormDialog.vue`          | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `dictionaries.ts`                            | `locales` only. The runtime override merge — server rows layered over what the app bundles, key by key.                                                     | [read](../tools/i18n.md)              |
| `locales/en.json`                            | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `locales/it.json`                            | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `module.ts`                                  | The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales. | [read](../theory/modules.md)          |
| `response-schemas.ts`                        | One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.                          | [read](../api/openapi-workflow.md)    |
| `routes.ts`                                  | The domain’s route records, spliced into the localised route tree. Each carries its own `meta.access`.                                                      | [read](../theory/sitemap.md)          |
| `schemas.ts`                                 | Form schemas for this domain, built on the generated request schemas rather than hand-written beside them.                                                  | [read](../api/openapi-workflow.md)    |
| `store.ts`                                   | The Pinia store: this domain’s state, and every call it makes to the generated client.                                                                      | [read](../tools/state-and-routing.md) |
| `tests/dictionaries.spec.ts`                 | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `tests/e2e/__snapshots__/locale-entries.png` | A committed visual-regression baseline.                                                                                                                     | [read](../tools/visual-regression.md) |
| `tests/e2e/__snapshots__/locales-list.png`   | A committed visual-regression baseline.                                                                                                                     | [read](../tools/visual-regression.md) |
| `tests/e2e/a11y.cy.ts`                       | Cypress suite — the screens, in a browser.                                                                                                                  | [read](../tools/component-testing.md) |
| `tests/e2e/locales.visual.cy.ts`             | Cypress suite — the screens, in a browser.                                                                                                                  | [read](../tools/component-testing.md) |
| `tests/store.spec.ts`                        | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `views/LocaleEntries.vue`                    | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |
| `views/LocalesList.vue`                      | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |

<!-- gen:files:end -->

## Working on it

<!-- gen:working:start -->

| Suite            | Files | Where                                          |
| ---------------- | ----- | ---------------------------------------------- |
| Vitest           | 2     | `src/modules/locales/tests/`                   |
| Cypress          | 2     | `src/modules/locales/tests/e2e/`               |
| Visual baselines | 2     | `src/modules/locales/tests/e2e/__snapshots__/` |

```bash
# this module's vitest suites
npm run test:unit -- locales

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/locales/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

<!-- gen:working:end -->

## Deeper in

<!-- gen:subpages:start -->

- [Runtime overrides](./locales-overrides.md)

<!-- gen:subpages:end -->

## Related pages

- [Runtime overrides](./locales-overrides.md) — the two tiers and how they merge
- [Internationalisation](../tools/i18n.md) — the mechanism both halves run on
- [Modules overview](./index.md) — the whole context map
- [Sitemap & Access Control](../theory/sitemap.md) — the `admin` gate on both screens
