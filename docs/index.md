---
layout: home
hero:
    name: Boilerplate Vue Frontend
    text: vue-spa
    tagline: Single-package Vue 3 SPA boilerplate, paired with boilerplate-node-backend.
    actions:
        - theme: brand
          text: Understand it
          link: /understand/start
        - theme: alt
          text: Build with it
          link: /build/start
        - theme: alt
          text: Browse modules
          link: /modules/start
        - theme: alt
          text: Operate it
          link: /operate/start
        - theme: alt
          text: Look it up
          link: /reference/start
features:
    - title: This repo's specific shape
      details: Vue 3 + Pinia + Vue Router + Vue I18n + OpenAPI-generated axios client, shipped as one SPA package.
    - title: Domains are deletable
      details: Five tiers and a module registry. Adding a domain is one folder plus one line; removing it is rm -rf plus that line.
    - title: Layers stay visible
      details: Views, composables, stores, generated API client, and HTTP interceptors each keep a small, clear job.
    - title: Tooling is part of the boilerplate
      details: Grafana Faro, Umami, Vitest, Cypress, and VitePress are all wired in as examples.
    - title: Contract-first workflow
      details: openapi.yaml drives the generated axios client and Zod schemas. asyncapi.yaml drives the realtime types.
---

## I want to…

| I want to…                                  | Go to                                                                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Use the demo shop, or explain it to someone | [the shop manual](https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/use-the-shop/start.md) (in the paired backend, optional) |
| Understand how and why it is built          | [Understand](./understand/start.md)                                                                                                           |
| Run it, change it, test it                  | [Build](./build/start.md)                                                                                                                     |
| Read how one domain works                   | [Modules](./modules/start.md)                                                                                                                 |
| Configure it and watch it                   | [Operate](./operate/start.md)                                                                                                                 |
| Look up an endpoint, a script, a file       | [Reference](./reference/start.md)                                                                                                             |

## What this docs site is for

This docs site stays short, visual, and practical.
Use it to understand **what this boilerplate is**, **how the app layers fit together**, and **which tools already exist in the repo**.

> Think of the repo as **an example frontend blueprint**, not a finished product with product-specific business rules.

## Family map

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 70}}}%%
flowchart TD
    A[Vue frontend boilerplate family] --> B[vue-spa\nthis repo]
    A --> C[vue-spa-skeleton\nsame shape, no UI]
    A --> D[vue-spa-vuetify\nskeleton + Vuetify]
    A --> E[vue-spa-quasar\nskeleton + Quasar]
    A --> F[nuxt-spa\nNuxt variant]

    B --> T[Understand]
    B --> M[Modules]
    B --> U[Build]
    B --> V[Operate]

    classDef family fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef current fill:#ddd6fe,stroke:#7c3aed,color:#111827;
    classDef docs fill:#dbeafe,stroke:#2563eb,color:#111827;
    class A,C,D,E,F family;
    class B current;
    class T,M,U,V docs;
```

## Read this repo as

- **SPA**: Vue 3 + Pinia + Vue Router, compiled by Vite.
- **API client**: [OpenAPI-generated axios client](./build/openapi-workflow.md) — types and functions come from `openapi.yaml`, never written by hand.
- **Realtime**: [SSE clients](./understand/realtime.md) driven by [`asyncapi.yaml`](./build/asyncapi-workflow.md).
- **State**: [Pinia stores](./understand/state-and-routing.md) own data; views stay thin.
- **Observability**: [Grafana Faro + Umami](./operate/observability.md) wired into a single store.
- **Dev backend**: [the demo profile](./build/demo-profile.md) — the real API, in-memory and seeded, one command.
- **Contracts**: [`openapi.yaml`](./build/openapi-workflow.md) + [`asyncapi.yaml`](./build/asyncapi-workflow.md).
- **Shape**: layered code explained in [Understand](./understand/start.md) and the dedicated [Layers](./understand/layers.md) page.

## Five sections, five jobs

- [Understand](./understand/start.md) — architecture, layers, request flow, sitemap, and the tools in plain English.
- [Build](./build/start.md) — run it, the API contract workflow, adding a module, every kind of test.
- [Modules](./modules/start.md) — one page per domain: what it owns, who depends on it, its store, screens and endpoints.
- [Operate](./operate/start.md) — environment variables, observability, analytics.
- [Reference](./reference/start.md) — the lookup surface: every folder, script, package and endpoint.

## Quick visual of the current repo

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 70}}}%%
flowchart LR
    OpenSpec[openapi.yaml] --> Client[contracts/rest.generated/index.ts\naxios client]
    OpenSpec --> Schemas[contracts/rest.generated/schemas.zod.ts\nZod schemas]
    AsyncSpec[asyncapi.yaml] --> Realtime[contracts/asyncapi.generated.ts]

    Client --> Stores[Pinia stores]
    Schemas --> Stores
    Stores --> Views[Views: platform shell + modules]
    Views --> Router[Vue Router]
    Views --> I18N[Vue I18n]
    Realtime --> RTClients[SSE client]
    RTClients --> Stores

    Stores --> Obs[Grafana Faro + Umami\nobservability store]

    classDef contract fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef generated fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef app fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef obs fill:#ede9fe,stroke:#7c3aed,color:#111827;
    class OpenSpec,AsyncSpec contract;
    class Client,Schemas,Realtime generated;
    class Stores,Views,Router,I18N,RTClients app;
    class Obs obs;
```

## Good starting points

- Never run it? [Getting Started](./build/run-locally.md).
- Want the app shape? [Understand](./understand/start.md) and [Layers](./understand/layers.md).
- Want to know what one domain does? [Modules](./modules/start.md).
- Want the `package.json` map? [Package Dependencies](./reference/package-dependencies.md) and [Package Scripts](./reference/package-scripts.md).
- Want the sitemap and route guards? [Sitemap & Access Control](./understand/sitemap.md).
- Want to change payloads or add endpoints? [API](./build/api-contracts.md).
