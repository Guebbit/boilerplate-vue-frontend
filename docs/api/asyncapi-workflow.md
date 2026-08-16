# AsyncAPI Workflow

## AsyncAPI is the async contract source of truth

Keep REST and async contracts separate:

- REST: `openapi.yaml`
- Async/event-driven: `asyncapi.yaml`

Current scope of `asyncapi.yaml` relevant to the FE:

- SSE observability stream (`observability.*`)
- Ecommerce cart checkout event (`ecommerce.cart.checked_out`)

## Servers declared (FE perspective)

| Name | Protocol | Purpose | Env var |
| ---- | -------- | ------- | ------- |
| `sseLocal` | `http` | SSE observability stream | `VITE_API_SSE` |

The AMQP and Redis pub/sub servers exist in `asyncapi.yaml` for backend use; the FE does not connect to them directly.

## Generated TypeScript types

Types are generated from `asyncapi.yaml` into `src/types/realtime.generated.ts`:

```bash
npm run gen:asyncapi
```

Import from `src/types/realtime.ts` (the thin app helper that re-exports from `realtime.generated.ts`):

```ts
import type { ISseEventName, ISseEventPayload } from '@types';
import { REALTIME_SSE_EVENT_NAMES } from '@types';
```

**Never edit `realtime.generated.ts` by hand** — it is overwritten on every `gen:asyncapi` run.

## Tooling used here

| Tool | Job |
| ---- | --- |
| `@asyncapi/cli` | validates `asyncapi.yaml` (`npm run gen:asyncapi` internally) |
| `@asyncapi/modelina` | generates TypeScript types from AsyncAPI schemas |
| custom `scripts/gen-asyncapi-types.ts` | runs modelina + appends the channel constants and the SSE payload map |

## Commands

```bash
npm run gen:asyncapi          # validate asyncapi.yaml + regenerate src/types/realtime.generated.ts
npm run check:asyncapi-types  # fail if the committed types are not what asyncapi.yaml generates
```

## Shared with the backend

`scripts/gen-asyncapi-types.ts` is **byte-identical** to the one in
`boilerplate-node-backend`. Only the output path differs, and it comes from `--out`:

| Repo | Command |
| --- | --- |
| Frontend | `tsx scripts/gen-asyncapi-types.ts --out src/types/realtime.generated.ts` |
| Backend | `tsx scripts/gen-asyncapi-types.ts --out src/types/asyncapi.generated.ts` |

Because `asyncapi.yaml` is identical too, the two generated files are identical — `diff` proves
it. The script emits a superset: this repo uses `ISseEventPayloadMap` for per-event payload
typing, the backend uses `OBSERVABILITY_CHANNELS` / `TObservabilityChannel`. The exports this
repo does not use are tree-shaken out of the bundle.

Both the spec and this script are in `SHARED_FILES` (`scripts/specIdentity.ts`), so
`check:spec-identity` fails on the commit that forks either. **The generated output is not**, and
deliberately: identical input through an identical deterministic generator cannot produce different
types, so a cross-repo comparison of the output would only re-ask a question the two entries above
already answer, at the price of carrying a fourth file between the repos on every contract change.

What that comparison *would* have added — "did this repo regenerate after the last spec edit" —
`check:asyncapi-types` answers here, with no sibling checkout to find. The backend runs the same
gate over its own copy.

## Realtime client workflow

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 65}}}%%
flowchart LR
    Spec[asyncapi.yaml] --> Gen[npm run gen:asyncapi]
    Gen --> Types[src/types/realtime.generated.ts]
    Types --> Clients[createSseClient]
    Clients --> Stores[realtimeObservability store]
    Stores --> View[RealtimePlayground view]
```

After editing `asyncapi.yaml`:

1. `npm run gen:asyncapi` — regenerate types (commit the diff).
2. Update realtime clients/stores if channel names or payload shapes changed.
3. Validate in the `RealtimePlayground` view before broader integration.

## Naming convention

Channels use dot-separated topic-style naming (e.g. `observability.metrics.snapshot`). The generator derives the FE types from them: `observability.*` (subscribe) feeds `REALTIME_SSE_EVENT_NAMES` and `ISseEventPayloadMap` — the single source of truth for SSE event names, never hardcode strings.

## How this complements OpenAPI

- OpenAPI describes HTTP request/response APIs.
- AsyncAPI describes message/event contracts across async transports.
- Together they provide one contract layer for REST and one for realtime flows.

## Useful links

- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/latest)
- [@asyncapi/modelina](https://modelina.org/)
- [EventSource / SSE (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

## Related pages

- [OpenAPI Workflow](./openapi-workflow.md)
- [Realtime](../tools/realtime.md)
- [API overview](./index.md)
