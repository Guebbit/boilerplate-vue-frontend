# Tools

This section explains **why dependencies exist** and where they fit in the app.

> OpenAPI-specific tools are documented in [API](../api/), not here.

## Tool map

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 55, 'rankSpacing': 75}}}%%
flowchart LR
    subgraph Core["Core stack"]
        Runtime[Runtime\nVue 3 · Vite · TypeScript · Sass]
        Security[Security\nJWT handling · route guards]
        StateRouting[State & Routing\nPinia · Vue Router · Vue I18n]
    end

    subgraph API["API & Contract"]
        Orval[Orval codegen\nopenapi.yaml → api/]
        Axios[Axios\nHTTP client]
        Zod[Zod\nvalidation]
        MSW[MSW\ndev + test mocking]
    end

    subgraph Obs["Observability"]
        Sentry[Sentry\ncrashes + performance]
        PostHog[PostHog\nproduct analytics]
    end

    subgraph Testing["Testing & Docs"]
        Vitest[Vitest\nunit tests]
        Cypress[Cypress\ne2e tests]
        Realtime[Realtime\nSSE + WebSocket clients]
        VitePress[VitePress\ndocs site]
    end

    classDef core fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef api fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef obs fill:#ede9fe,stroke:#7c3aed,color:#111827;
    classDef test fill:#fce7f3,stroke:#db2777,color:#111827;
    class Runtime,Security,StateRouting core;
    class Orval,Axios,Zod,MSW api;
    class Sentry,PostHog obs;
    class Vitest,Cypress,Realtime,VitePress test;
```

## Read by intent

| Group | Page | What you'll find |
| ----- | ---- | ---------------- |
| Overview | **[Tools Explained](./tools-explained.md)** | "What is X and why is it here?" for every tool: plain-English definition, problem it solves, and how it's wired in this repo. |
| Setup | **[Runtime](./runtime.md)** | Vue 3, Vite, TypeScript, Sass, @vitejs/plugin-vue: the framework-level packages that make the app build and run. |
| Setup | **[Security](./security.md)** | How the FE handles JWT access tokens, refresh cookies, and route guards. |
| Setup | **[Package Dependencies](./package-dependencies.md)** | Guided tour of `package.json` grouped by concern. |
| Setup | **[Package Scripts](./package-scripts.md)** | What every `npm run <script>` does and when to reach for it. |
| Framework | **[State & Routing](./state-and-routing.md)** | Pinia stores, Vue Router locale routing and guards, Vue I18n setup. |
| Framework | **[Realtime](./websockets.md)** | FE SSE and WebSocket clients, `createSseClient`, `createChatClient`, realtime stores. |
| Observability | **[Observability](./observability.md)** | Sentry (errors + session replay) and PostHog (analytics + feature flags) wired into one Pinia store. |
| Observability | **[PostHog](./posthog.md)** | Product analytics events, feature flags, and the event taxonomy used in this repo. |
| Testing | **[Testing](./testing-and-docs.md)** | Vitest, @vue/test-utils, Cypress, and VitePress: how the repo tests itself and builds this docs site. |
| Testing | **[Mocking (MSW)](./mocking.md)** | MSW handler architecture, in-memory DB, how to add a handler, and Cypress integration. |
| API | **[API](../api/)** | Orval, Spectral, generated client, and contract-first workflow. |
