# Architecture

Use this page for the **big blocks and their boundaries**.
If you want the exact folder order, jump to [Layers](./layers.md).

## Architecture frame

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 65, 'rankSpacing': 85}}}%%
flowchart TD
    Contract["Contracts\nopenapi.yaml + asyncapi.yaml"] --> Generated["Generated layer\napi/ + realtime types"]
    Generated --> Stores["Pinia stores\nsrc/stores/"]
    Stores --> Views["Views + features\nsrc/views/ + src/features/"]
    Views --> Router["Vue Router\nsrc/router/"]
    Views --> I18N["Vue I18n\nsrc/locales/"]

    HTTP["HTTP layer\nsrc/utils/http.ts\naxios + interceptors"] --> Stores
    Generated --> HTTP

    Obs["Observability\nGrafana Faro + Umami\nsrc/stores/observability.ts"] --> Views
    Obs --> Router

    MSW["MSW\ntests/mocks/\ndev + test only"] -.intercepted by.-> HTTP

    classDef contract fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef generated fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef app fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef nav fill:#ede9fe,stroke:#7c3aed,color:#111827;
    classDef obs fill:#fce7f3,stroke:#db2777,color:#111827;
    classDef mock fill:#f0fdf4,stroke:#16a34a,color:#111827;

    class Contract contract;
    class Generated,HTTP generated;
    class Stores,Views app;
    class Router,I18N nav;
    class Obs obs;
    class MSW mock;
```

## What each block owns

| Block | Owns | Avoids |
| ----- | ---- | ------ |
| Contract layer | public request/event shapes — see [OpenAPI Workflow](../api/openapi-workflow.md) | hidden drift from implementation |
| Generated layer | typed axios functions, Zod schemas, MSW stubs — all derived from `openapi.yaml` | hand-written duplicates |
| HTTP layer | axios instance, request/response interceptors, error shaping into `IResponseReject` | business decisions |
| Pinia stores | data fetching, caching, reactive state, API calls | direct DOM manipulation |
| Views + features | template rendering, UI composition, user events | data fetching logic |
| Router + I18N | navigation, locale injection, route guards | deep business decisions |
| Observability | error capture + tracing (Grafana Faro) and analytics (Umami) via a single store | scattered vendor calls |

## Why this page exists next to Layers

- **Architecture** answers: "which major blocks talk to each other?"
- **Layers** answers: "which folder/file path do I open next?"

Keeping those separate reduces repetition and makes scanning faster.

## Why this matters in a boilerplate

A boilerplate should be easy to copy, swap piece by piece, test in isolation, and extend without turning one file into a giant blob.
That is why the repo favors **clear ownership lines** instead of component-heavy data fetching.
The [Layers](./layers.md) page maps each block to an exact folder.

## Design rules used here

- **SOLID**: each layer should have one main reason to change.
- **DRY**: shared logic belongs in stores, composables, or utilities.
- **KISS**: keep flows boring and predictable.
- **OpenAPI first**: never hand-write what can be generated from the spec.

## Related pages

- See [Layers](./layers.md) for the exact folder stack.
- See [Request Flow](./request-flow.md) for the live path of one user action.
- See [Runtime](../tools/runtime.md) and [State & Routing](../tools/state-and-routing.md) for the libraries enabling this shape.
- See [OpenAPI Workflow](../api/openapi-workflow.md) for how the contract drives the generated layer.
