# Modules

`src/modules/` is most of the repository, and almost none of it is unique. Fourteen domains are
built from the same dozen file shapes, so this page explains each **shape** once and then says
which module carries which.

A module is a typed value declared in `module.ts`, not a folder convention — the same idea the
paired backend uses, so a domain is added or removed on both sides the same way. See
[Modules](../theory/modules.md) and
[Adding & Removing a Module](../theory/module-lifecycle.md).

---

::: tip This page explains shapes. For a domain, read its page.
Everything below describes a **file shape** — what a `store.ts` is, wherever you find one. What each
domain does with those shapes, which of them it carries, and what it owns is on its own page under
[Modules](../modules/).

The shapes below are also enforced. `tests/cross-cutting/module-file-shapes.spec.ts` holds the same
catalogue in code, and fails on a file in a module folder that matches none of them — so a new shape
costs one line here and one there, and stops being invisible.
:::

## The shape of one module

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 35, 'rankSpacing': 45}}}%%
flowchart TD
    Manifest["module.ts<br/><i>the declaration</i>"] --> Routes["routes.ts"]
    Routes --> Views["views/"]
    Views --> Components["components/"]
    Views --> Store["store.ts"]
    Store --> Schemas["response-schemas.ts<br/><i>what the API promised</i>"]
    Store --> Domain["domain/<br/><i>pure rules</i>"]
    Manifest -.-> Side["locales/ · guards.ts · composables/"]

    classDef dec fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef layer fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef pure fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef side fill:#ede9fe,stroke:#7c3aed,color:#111827;
    class Manifest dec;
    class Routes,Views,Components,Store,Schemas layer;
    class Domain pure;
    class Side side;
```

## The core shape

| Pattern                             | What it is                                                                                                                                                                                           | Read next                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/modules/*/module.ts`           | The manifest, and the only file the application loads directly. Declares the module's name, its routes, its navigation entries and its locales. Everything else in the folder is reached through it. | [Modules](../theory/modules.md)                                                                     |
| `src/modules/*/routes.ts`           | The module's slice of the router: paths, the views they render, and the guard each requires. Reading it top to bottom is reading the module's URL surface.                                           | [State & Routing](../tools/state-and-routing.md) · [Sitemap & Access Control](../theory/sitemap.md) |
| `src/modules/*/views/*.vue`         | One component per route — the page. Reads the store, renders the UI kit, and owns no transport of its own.                                                                                           | [State & Routing](../tools/state-and-routing.md)                                                    |
| `src/modules/*/store.ts`            | The Pinia store: this domain's state, the API calls that fill it, and the actions a view dispatches. The only tier that talks to the generated client.                                               | [State & Routing](../tools/state-and-routing.md)                                                    |
| `src/modules/*/response-schemas.ts` | The Zod schemas each of this module's calls validates its response against — the module's half of the response-schema map, so the contract is checked rather than trusted.                           | [Infrastructure](./src-infrastructure.md) · [OpenAPI Workflow](../api/openapi-workflow.md)          |
| `src/modules/*/locales/*.json`      | This module's user-facing strings, one file per language.                                                                                                                                            | [App, Kernel & Types](./src-app.md)                                                                 |

## The optional shape

Present when the domain needs it. A module with none of these is not incomplete; it is small.

| Pattern                          | What it is                                                                                                                                                            | Read next                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/modules/*/index.ts`         | The public barrel: what siblings are allowed to import. Reaching past it into a module's internals is a lint error, so this file _is_ the module's published surface. | [Strategic DDD](../theory/strategic-ddd.md)                                |
| `src/modules/*/components/*.vue` | Components that render **this domain's** data. Anything that renders a shape rather than a domain belongs in [the UI kit](./src-ui.md) instead.                       | [UI Kit](./src-ui.md) · [Component Testing](../tools/component-testing.md) |
| `src/modules/*/composables/*.ts` | Reusable reactive logic this domain needs and no other does.                                                                                                          | [State & Routing](../tools/state-and-routing.md)                           |
| `src/modules/*/domain/*.ts`      | Pure rules over plain data — no store, no HTTP, no component. A rule returns a verdict and the caller decides what to render.                                         | [Domain Layer](../theory/domain-layer.md)                                  |
| `src/modules/*/schemas.ts`       | Form and request schemas — what this module validates before sending, as opposed to the responses it validates on arrival.                                            | [OpenAPI Workflow](../api/openapi-workflow.md)                             |
| `src/modules/*/guards.ts`        | Route guards specific to this domain, beyond the shared authentication ones.                                                                                          | [Sitemap & Access Control](../theory/sitemap.md)                           |
| `src/modules/*/types.ts`         | View-model types this module needs that the contract does not supply.                                                                                                 | [App, Kernel & Types](./src-app.md)                                        |
| `src/modules/*/dictionaries.ts`  | Lookup tables this domain renders from — status labels, enum captions.                                                                                                | [App, Kernel & Types](./src-app.md)                                        |

## The one-offs

Shapes that exist in exactly one module. Each is a piece of a domain no other domain has.

| File                                                 | What it is                                                                                                                                                                                                                                   | Read next                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/modules/demo/provided.ts`                       | `demo` only. The typed `InjectionKey` and the provide/inject pair behind it, replacing a magic string that had been spelled in two files. The consumer throws rather than falling back to a placeholder, so a missing provider fails loudly. | [State & Routing](../tools/state-and-routing.md) |
| `src/modules/realtime/store.ts`                      | `realtime` only. The SSE subscription this domain owns, on top of the shared typed client.                                                                                                                                                   | [Realtime](../tools/realtime.md)                 |
| `src/modules/realtime/use-realtime-observability.ts` | `realtime` only. The composable a view binds to that subscription with.                                                                                                                                                                      | [Realtime](../tools/realtime.md)                 |

::: tip Where the tests are
Every module also carries `src/modules/*/tests/` — its own unit, component and e2e files. They are
catalogued on [Tests](./tests.md), with the rest of the suite.
:::

## Which module carries which

Per-module answers live on the [Modules](../modules/) pages, one per domain, and the whole set is
[the matrix on its overview](../modules/index.md#every-module).

Both are per-domain answers rather than file shapes, which is the reason they are there and not here.
They are written by hand: a module that gains a screen or a store gains the row when someone adds it.
