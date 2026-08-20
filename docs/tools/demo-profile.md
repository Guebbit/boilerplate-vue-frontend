# The demo profile

::: tip Mechanism here, domain on its module page
The seeded backend, the profile and the commands are here. The `demo` **module** — the client-side showroom, and the only module in either repository with no backend counterpart — is on [its module page](../modules/demo.md).
:::

Development and the fast e2e suite run against the paired backend's **demo profile** — the real API, booted self-contained and disposable:

```sh
npm --prefix ../boilerplate-node-backend run demo
```

One process: the actual application against an in-memory MongoDB (the same `mongodb-memory-server` its test suite uses), seeded with every enabled module's demo fixtures, cache and queue running `disabled` — a supported deployment shape the health endpoint reports honestly. It boots in seconds, holds nothing on disk, and several instances run side by side (`NODE_PORT=3101 npm run demo`), each owning its own database.

## What replaced MSW, and why

This repo used to carry a hand-written MSW imitation of the backend — per-module handlers, an in-page mock database, a journal to survive reloads, and a byte-shared copy of the demo dataset to keep the imitation honest. The docs of that era said it plainly: *MSW is a convenience, not a contract; it is allowed to be wrong.* The live CI gate existed precisely because the imitation could drift.

The demo profile removes the imitation instead of guarding it. There is one implementation of the API's behaviour — the backend's — and both the dev server and the e2e suite talk to it. A new endpoint exists here the moment the backend implements it; a filtering rule is right here because it is the same code. Nothing is allowed to be wrong, because nothing is a copy.

What each concern maps to now:

| Concern | Where it lives |
| --- | --- |
| Seeded, deterministic data | The backend's own `db/demo` fixtures, seeded at boot and on every reset |
| Reset between e2e specs | `POST /__demo/reset` — drops the in-memory database and reseeds, in-process |
| Reading "sent" emails (reset tokens) | `GET /__demo/emails` — in demo mode the mailer records to an outbox instead of SMTP |
| Contract conformance of responses | `orvalMutator` parses every response through its OpenAPI-derived Zod schema (see [Live E2E](./live-e2e.md)) |
| Full-stack behaviour (real Redis, real broker) | The **live profile**, unchanged: `npm run test:e2e:live` and the required `test-e2e-live` CI job |

## How the e2e suite uses it

`npm run test:e2e` builds the bundle once, then boots **one demo backend per shard** (ports `3101+`) so the four Cypress processes cannot see each other's writes — the isolation MSW's in-page state used to provide, now with the real application behind it. Each shard's Cypress carries `CYPRESS_apiUrl`, and the overwritten `cy.visit` injects it into the page as the `__E2E_API_URL` runtime override the axios client reads before falling back to the baked `VITE_API_URL` (`src/infrastructure/http/client.ts`).

`cy.resetState()` POSTs the shard's own `/__demo/reset` before every spec; `cy.demoEmailTo(address)` reads the outbox. Specs that need the full stack open with `cy.skipUnlessLive()`; specs that hinge on the outbox open with `cy.skipUnlessDemo()`, because against the live profile the emails leave through a real queue a browser cannot read.

## Working without any backend

There is no offline mock of the app any more, deliberately: a stateless imitation renders pages whose every flow is dead, which demonstrates less than it appears to. The demo profile *is* the no-infrastructure path — it needs Node and the sibling checkout, nothing else.
