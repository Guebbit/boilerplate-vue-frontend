# Unit Testing

The layer that answers: **does this one piece of logic — a component, a store, a plugin — behave correctly in isolation?** Fast (whole suite runs in a few seconds), deterministic, and the only layer that mocks the network by hand rather than through MSW.

## Tools

| Tool | Role |
| --- | --- |
| [Vitest](https://vitest.dev/) | Test runner — same Vite config and transforms the app itself uses, so no separate build step |
| [@vue/test-utils](https://test-utils.vuejs.org/) | Mounts components, drives props/emits/slots |
| [jsdom](https://github.com/jsdom/jsdom) | DOM implementation Vitest runs component tests against (via `tests/unit/jsdom-quiet-css.env.ts` — see that file for why it's a thin wrapper around plain `jsdom` rather than the string `'jsdom'`) |
| [Pinia](https://pinia.vuejs.org/) (`createPinia()` per test) | Stores under test get a fresh instance every time — no state leaks between tests |
| `vi.mock()` | Replaces `@api` (the generated client), `@/stores/observability`, etc. with hand-written stubs |
| [msw/node](https://mswjs.io/docs/integrations/node) | The *one* place this layer mocks HTTP for real instead of stubbing a module — `httpRefresh.spec.ts`, see below |

## Where it sits

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 65}}}%%
flowchart TB
    Source["src/**\ncomponents · stores · plugins · utils"] --> Unit["Vitest\ntests/unit/**/*.spec.ts"]
    Unit --> ModuleMock["vi.mock('@api', ...)\nhand-written return values"]
    Unit --> NodeMSW["msw/node\nreal HTTP, real interceptor chain\n(httpRefresh.spec.ts only)"]
    Unit --> Coverage[("v8 coverage\nnpm run test:unit:coverage")]
    Unit --> Mutation["Stryker\nmutation-tests THIS layer\nsee Mutation Testing"]

    classDef src fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef test fill:#ddd6fe,stroke:#7c3aed,color:#111827;
    classDef mock fill:#fef3c7,stroke:#d97706,color:#111827;
    classDef out fill:#dcfce7,stroke:#16a34a,color:#111827;
    class Source src;
    class Unit test;
    class ModuleMock,NodeMSW mock;
    class Coverage,Mutation out;
```

Everything below this layer (components, Pinia stores, `src/plugins/http`, `src/utils`) is exercised **without** a browser and **without** MSW's Service Worker — that combination starts one layer up, in [E2E — Mock Profile](./mocking.md).

## Patterns

### Component tests — mount + Vuetify plugin

Components that use Vuetify components internally (`v-number-input`, etc.) must be mounted with the app's real Vuetify plugin instance, otherwise Vuetify's own child components don't resolve:

```ts
import { mount } from '@vue/test-utils';
import vuetify from '@/plugins/vuetify';

const mountCounter = (props = {}) =>
    mount(FormCounterInput, { props, global: { plugins: [vuetify] } });
```

`tests/unit/components/atoms/CounterInput.spec.ts` and `tests/unit/components/Navigation.spec.ts` are the two examples.

### Store tests — `vi.mock('@api', ...)`

Every feature store (`cart`, `orders`, `products`, `users`) is tested by mocking the generated API client at the module boundary, not by hitting a network at all:

```ts
vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve({ data: CART })),
    upsertCartItem: vi.fn(() => Promise.resolve({ data: CART }))
}));
```

`createPinia()` + `setActivePinia()` in a `beforeEach` gives every test a clean store. This is the layer that catches a store forgetting to fire (or over-firing) an analytics event, or mishandling a not-yet-fetched empty state — see `tests/unit/features/cart/store.spec.ts`'s header comment for the two specific regressions this pattern was built to catch.

### The one exception — a real HTTP server for the refresh flow

`tests/unit/plugins/httpRefresh.spec.ts` is deliberately **not** stubbed at the module boundary. The 401 → refresh → replay flow lives entirely inside axios's interceptor chain (`src/plugins/http/index.ts`), so a hand-rolled stub would never actually exercise it — there'd be nothing to intercept. It uses `msw/node` (the same MSW package the browser mock profile uses, in its Node integration) to run a real server and assert on the request sequence:

```ts
const server = setupServer(
    http.get(`${API}/account/refresh`, () => HttpResponse.json({ data: { token: 'fresh-token' } })),
    http.get(`${API}/orders`, ({ request }) => /* 401 unless Authorization matches */ )
);
```

`tests/unit/plugins/http.spec.ts` covers the same module's error-normalisation logic with plain stubs — the two are complementary, not overlapping.

### Response-validation and mock-transport tests

`tests/unit/plugins/httpValidateResponses.spec.ts` and `tests/unit/mocks/mockTransport.spec.ts` unit-test two small but load-bearing pieces built for [Live E2E](./live-e2e.md) and [Mocking](./mocking.md) respectively: `orvalMutator`'s `VITE_VALIDATE_RESPONSES` contract check, and the response builders every mock handler returns through. `tests/unit/mocks/mockProfiles.spec.ts` covers the [random-data profile](./e2e-random-profile.md)'s two database builders directly, without going through Cypress at all — see that page for why isolating it here matters (reproducibility and coherence are properties of the *data*, testable without a browser).

## File map

| Path | Contents |
| --- | --- |
| `tests/unit/components/**` | Component mount tests |
| `tests/unit/features/*/store.spec.ts` | Pinia store tests, one per feature |
| `tests/unit/plugins/**` | `orvalMutator`, the refresh flow, response validation |
| `tests/unit/mocks/**` | Unit coverage for the mock layer's own building blocks (not the handlers themselves — those are exercised through Cypress) |
| `tests/unit/middlewares/**`, `tests/unit/router/**`, `tests/unit/realtime/**`, `tests/unit/utils/**`, `tests/unit/stores/**` | Route guards, router config, SSE client, formatters/error helpers, the realtime-observability store |
| `tests/unit/setup.ts` | Global Vitest setup (runs before every file) |
| `tests/unit/jsdom-quiet-css.env.ts` | Custom environment: plain jsdom with one class of CSS-parser noise filtered — see the file's own comment |
| `vitest.config.ts` | Test runner config (environment, setup files, coverage) |
| `vitest.config.mutation.ts` | Narrower variant Stryker drives — see [Mutation Testing](./mutation-testing.md) |

## Commands

| Command | Effect |
| --- | --- |
| `npm run test:unit` | Full suite, CI mode |
| `npm run test:unit:coverage` | Same, with v8 coverage |
| `npm run test:unit:target` | One hardcoded file, for fast iteration while editing it |

## Related pages

- [Testing](./testing-and-docs.md) — suite overview
- [Mocking (MSW)](./mocking.md) — where mocking stops being module-level and becomes a real Service Worker
- [Live E2E](./live-e2e.md) — `VITE_VALIDATE_RESPONSES`, unit-tested here, does its real work there
- [Mutation Testing](./mutation-testing.md) — mutates this layer's source and checks these tests notice
