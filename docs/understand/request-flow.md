---
type: concept
audience: [developer]
---

# Request Flow

How one user action becomes an HTTP call and a screen update, and what each layer does on the way.

## End-to-end path

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 90}}}%%
flowchart LR
    User(["User\naction"])

    subgraph View ["View / Component"]
        direction TB
        Template["Template\nevent handler"]
        Comp["Composable\nform / list logic"]
        Template --> Comp
    end

    subgraph State ["Pinia store"]
        direction TB
        Store["Store action\norchestration"]
    end

    subgraph Client ["Generated client"]
        direction TB
        Fn["contracts/rest.generated/index.ts\ntyped axios function"]
        HTTP["src/infrastructure/http/\ninterceptors"]
        Fn --> HTTP
    end

    Backend[("Backend\n(demo or full stack)")]
    Resp(["Reactive\nstate update"])

    User --> Template
    Comp --> Store
    Store --> Fn
    HTTP -->|HTTP/JSON| Backend
    Backend --> HTTP

    HTTP -->|"2xx: typed data"| Store
    Store --> Resp
    HTTP -->|"401: refresh, replay once"| Backend
    HTTP -->|"401: REAUTH_REQUIRED"| Step["Step-up prompt\n(ReauthDialog)"]
    HTTP -->|"any other failure: normalised problem"| Store
    Store -->|rejects to| Caller["Call site\ntoast or in-place alert,\nreported to Faro"]

    classDef user fill:#f0fdf4,stroke:#16a34a,color:#111827;
    classDef view fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef store fill:#ddd6fe,stroke:#7c3aed,color:#111827;
    classDef http fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef err fill:#fee2e2,stroke:#dc2626,color:#111827;

    class User,Resp user;
    class Template,Comp view;
    class Store store;
    class Fn,HTTP,Backend http;
    class Step,Caller err;
```

## Observability signals

Every navigation and every HTTP error produces signals in parallel with the flow above.

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 80}}}%%
flowchart LR
    Nav(["Route\nchange"])
    Err(["HTTP\nerror"])

    subgraph Analytics["Umami (product analytics)"]
        PH["Umami tracker tag\nautomatic pageviews\n(custom events: backend-side)"]
    end

    subgraph ErrorMon["Grafana Faro (error monitoring)"]
        SE["captureException()\nfetch/XHR traces\nweb-vitals"]
    end

    Nav -.->|"automatic pageview"| PH
    Err -.->|"5xx / unhandled"| SE

    classDef nav fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef err fill:#fee2e2,stroke:#dc2626,color:#111827;
    classDef ph fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef se fill:#ede9fe,stroke:#7c3aed,color:#111827;

    class Nav nav;
    class Err err;
    class PH ph;
    class SE se;
```

## What each layer does

| Layer                                                  | Responsibility                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View / template                                        | Renders data, captures user events, delegates to composables                                                                                                            |
| Composable                                             | Encapsulates form state, validation, and list logic for one domain                                                                                                      |
| Pinia store                                            | Orchestrates API calls, holds reactive data, exposes actions                                                                                                            |
| Generated client (`contracts/rest.generated/index.ts`) | Typed axios function per operation — regenerated from `openapi.yaml`                                                                                                    |
| `src/infrastructure/http/install.ts`                   | Registers the request/response interceptors on the single axios instance (`client.ts`); `src/main.ts` calls it at boot; they shape errors into `AxiosResponseErrorData` |
| Router guards                                          | `tryRestoreAuth` then `enforceRouteAccess` (`beforeEach`), `localeChoice` (`beforeResolve`) — run before the view is entered; redirect on failure                       |

## Why the flow matters

When you change behavior, ask:

- Is this an **API contract** change? Go to [API](../build/api-contracts.md).
- Is this a **dependency or build** concern? Go to [Tool map](./tool-map.md).
- Is this a **layer ownership** issue? Go back to [Layers](./layers.md).
- Is this about **routing or access control**? Go to [Sitemap & Access Control](./sitemap.md).

## Read next

- [Cross-cutting strategies](./request-flow-strategies.md)
