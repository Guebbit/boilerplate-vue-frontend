---
layout: home
hero:
    name: Boilerplate Vue Frontend
    text: vue-spa
    tagline: Single-package Vue 3 SPA boilerplate, paired with boilerplate-node-backend.
    actions:
        - theme: brand
          text: Read Theory
          link: /theory/
        - theme: alt
          text: Explore Tools
          link: /tools/
        - theme: alt
          text: Follow the API flow
          link: /api/
features:
    - title: This repo's specific shape
      details: Vue 3 + Pinia + Vue Router + Vue I18n + OpenAPI-generated axios client, shipped as one SPA package.
    - title: Layers stay visible
      details: Views, composables, stores, generated API client, and HTTP interceptors each keep a small, clear job.
    - title: Tooling is part of the boilerplate
      details: Grafana Faro, Umami, MSW mocking, Vitest, Cypress, and VitePress are all wired in as examples.
    - title: Contract-first workflow
      details: openapi.yaml drives the generated axios client and Zod schemas. asyncapi.yaml drives the realtime types.
---

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

    B --> T[Theory]
    B --> U[Tools]
    B --> V[API]

    classDef family fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef current fill:#ddd6fe,stroke:#7c3aed,color:#111827;
    classDef docs fill:#dbeafe,stroke:#2563eb,color:#111827;
    class A,C,D,E,F family;
    class B current;
    class T,U,V docs;
```

## Read this repo as

- **SPA**: Vue 3 + Pinia + Vue Router, compiled by Vite.
- **API client**: [OpenAPI-generated axios client](./api/openapi-workflow.md) — types and functions come from `openapi.yaml`, never written by hand.
- **Realtime**: [SSE + WebSocket clients](./tools/websockets.md) driven by [`asyncapi.yaml`](./api/asyncapi-workflow.md).
- **State**: [Pinia stores](./tools/state-and-routing.md) own data; views stay thin.
- **Observability**: [Grafana Faro + Umami](./tools/observability.md) wired into a single store.
- **Dev mocking**: [MSW](./tools/mocking.md) lets the app run without a backend.
- **Contracts**: [`openapi.yaml`](./api/openapi-workflow.md) + [`asyncapi.yaml`](./api/asyncapi-workflow.md).
- **Shape**: layered code explained in [Theory](./theory/) and the dedicated [Layers](./theory/layers.md) page.

## Three sections, three jobs

### [Theory](./theory/)

Big picture: architecture, layers, request flow, and sitemap.

### [Tools](./tools/)

Dependency-focused pages: runtime, state, routing, security, mocking, observability, and testing.
New to the stack? Start at [Tools Explained](./tools/tools-explained.md) for a plain-English "what is X and why is it here" summary of every tool.

### [API](./api/)

Contract-first workflow: OpenAPI + AsyncAPI, codegen, generated client usage, and mocks.

## Quick visual of the current repo

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 70}}}%%
flowchart LR
    OpenSpec[openapi.yaml] --> Client[contracts/rest/index.ts\naxios client]
    OpenSpec --> Schemas[contracts/rest/schemas.zod.ts\nZod schemas]
    OpenSpec --> Mocks[tests/mocks/generated.ts\nMSW stubs]
    AsyncSpec[asyncapi.yaml] --> Realtime[src/types/realtime.generated.ts]

    Client --> Stores[Pinia stores]
    Schemas --> Stores
    Stores --> Views[Views + features]
    Views --> Router[Vue Router]
    Views --> I18N[Vue I18n]
    Realtime --> RTClients[SSE + WS clients]
    RTClients --> Stores

    Stores --> Obs[Grafana Faro + Umami\nobservability store]

    classDef contract fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef generated fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef app fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef obs fill:#ede9fe,stroke:#7c3aed,color:#111827;
    class OpenSpec,AsyncSpec contract;
    class Client,Schemas,Mocks,Realtime generated;
    class Stores,Views,Router,I18N,RTClients app;
    class Obs obs;
```

## Good starting points

- Want the app shape? Start at [Theory Overview](./theory/) and [Layers](./theory/layers.md).
- Want a specific dependency? Start at [Tools](./tools/) and jump to the tool page you need.
- Want the `package.json` map? Read [Package Dependencies](./tools/package-dependencies.md) and [Package Scripts](./tools/package-scripts.md).
- Want to understand the sitemap and route guards? Read [Sitemap & Access Control](./theory/sitemap.md).
- Want to change payloads or add endpoints? Start in [API Overview](./api/) and keep [`openapi.yaml`](./api/openapi-workflow.md) first.
