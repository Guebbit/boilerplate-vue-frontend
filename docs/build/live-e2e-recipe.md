---
type: task
audience: [developer]
---

# Live E2E: the recipe

Part of [Live E2E](./live-e2e.md): the exact commands that bring the backend stack up for a live run.

## The recipe

One recipe, for CI and for a person. The backend needs five things around it, and a live run is
one lane at a time: every run binds the same ports (27017, 6379, 5672, 1025/8025, 3070, 3071, 3000).

```mermaid
flowchart LR
    Cy["Cypress<br/>(frontend)"] --> Api["backend :3000"]
    Api --> Mongo["Mongo replica set :27017"]
    Api --> Redis["Redis :6379"]
    Api --> Rabbit["RabbitMQ :5672"]
    Api --> Mail["Mailpit :1025 / :8025"]
    Api --> Hook["TLS door :3070 → webhook-tester :3071"]
    Cy -.->|"cy.emailTo()"| Mail
    Cy -.->|"reads deliveries"| Hook
```

### 1. Services

Plain `docker run` (or `podman run`) is enough; nothing needs compose.

```sh
# Mongo must be a REPLICA SET: the backend runs transactions, a standalone mongod refuses them.
# The member host must be 127.0.0.1.
docker run -d --name e2e-mongo -p 27017:27017 mongo:9.0.4 --replSet rs0 --bind_ip_all
docker exec e2e-mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'

docker run -d --name e2e-redis -p 6379:6379 redis:8
docker run -d --name e2e-rabbit -p 5672:5672 rabbitmq:4-management

# Mail: an SMTP catcher with an HTTP API. cy.emailTo() reads it; cy.restore() empties it.
docker run -d --name e2e-mailpit -p 1025:1025 -p 8025:8025 \
  -e MP_SMTP_AUTH_ACCEPT_ANY=true -e MP_SMTP_AUTH_ALLOW_INSECURE=true axllent/mailpit

# Webhooks land here; the specs read it to check the delivery and its signature.
# Plain HTTP on 3071, and never used directly: a webhook URL must be https, so 3070 is the TLS door below.
docker run -d --name e2e-webhooks -p 3071:8080 \
  -e AUTO_CREATE_SESSIONS=true -e STORAGE_DRIVER=memory \
  ghcr.io/tarampampam/webhook-tester:2.3.0

# The TLS door: Caddy serving the backend's committed demo leaf (a test CA the backend's development doubles
# trust while NODE_WEBHOOK_DEMO_SINK_URL is set) on 3070, forwarding to the tester. Run it
# from the frontend repo, with the backend checked out at $BACKEND (its Caddyfile and certificates).
docker run -d --name e2e-webhooks-tls --network host \
  -e WEBHOOK_TLS_PORT=3070 -e WEBHOOK_UPSTREAM=127.0.0.1:3071 \
  -v "$BACKEND/docker/webhook-tester-tls.Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v "$BACKEND/scenarios/support/tls:/certs:ro" \
  caddy:2.10.2-alpine caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
```

`analytics.cy.ts` also needs Umami and its Postgres (see [below](#point-the-backend-at-umami-or-the-analytics-spec-fails-with-umami-running)). Without them that one spec fails; the rest do not need it.

### 2. Backend

The backend repo's compose file carries the same services under `--profile integrations`, if you have compose.

```sh
cd boilerplate-node-backend

# What the backend needs to boot without a .env; throwaway values.
export NODE_ENV=development            # the seeder's public demo passwords, and the webhook sink, need it
export NODE_PSEUDONYM_KEY=any-throwaway-value
export NODE_RABBITMQ_HOST=127.0.0.1    # `host` sets the database and Redis, not the broker
export NODE_RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672   # the backend's .env may carry `amqp://queue:5672`, which shadows HOST/PORT: no broker, no webhook sends, no error
export NODE_FRONTEND_URL=http://localhost:8085
export NODE_WEBHOOK_DEMO_SINK_URL=https://127.0.0.1:3070   # the TLS door; the literal IP: the SSRF guard's DNS lookup skips /etc/hosts
export NODE_PAYMENT_WEBHOOK_SECRET=any-throwaway-secret   # a spec signs a payment-provider delivery with it: export the same value as E2E_PAYMENT_WEBHOOK_SECRET in the frontend shell

# The operator's legal identity, printed on invoices, in every order mail's withdrawal notice and on the Terms, Legal and Privacy pages. Boot refuses without it (the phone too, while the shop is present).
export NODE_LEGAL_NAME='Guebbit Demo Shop Srl' NODE_LEGAL_STREET='Via Roma 1' NODE_LEGAL_CITY=Milano \
       NODE_LEGAL_ZIP=20100 NODE_SUPPORT_EMAIL=support@example.com NODE_LEGAL_PHONE='+39 02 1234567'
# Its country, the shop's clock, and the VAT pair (`orders` and `products` refuse to boot without them too).
export NODE_LEGAL_COUNTRY=IT NODE_SHOP_TIMEZONE=Europe/Rome NODE_VAT_RATE_DEFAULT=0.22 NODE_VAT_RATE_REDUCED=0.10

# Mail into Mailpit. `e2e:serve` refuses any SMTP host but localhost, 127.0.0.1, ::1 or mailpit,
# so a live run cannot send real mail. NODE_MAIL_TRANSPORT=log sends nothing at all, but then
# no mailed link or code can be read back.
export NODE_MAIL_TRANSPORT=smtp NODE_SMTP_HOST=127.0.0.1 NODE_SMTP_PORT=1025 \
       NODE_SMTP_USER=e2e NODE_SMTP_PASS=e2e NODE_SMTP_SENDER='E2E <noreply@example.com>'

# Volume budgets only (see below). Payments, invoicing and returns keep their defaults.
export NODE_RATE_LIMIT_MAX=100000 NODE_AUTH_RATE_LIMIT_MAX=1000 NODE_AUTH_RATE_LIMIT_ADDRESS_MAX=1000 \
       NODE_SIGNUP_RATE_LIMIT_MAX=1000 NODE_RESET_RATE_LIMIT_MAX=1000

# The limiter's counters must live in Redis, so that `cy.restore()`'s reseed clears them. Left in
# the backend's memory they outlive every reseed, and the payment budget (5 card confirms per
# account per hour) trips every journey that pays by card as the same customer.
export NODE_RATE_LIMIT_REDIS_URL=redis://127.0.0.1:6379

npm run host -- db:bootstrap    # migrate + seed
npm run host -- e2e:serve       # the backend, marked as an e2e run
npm run host -- e2e:worker      # in a second terminal: takes the jobs the backend publishes to RabbitMQ (own port 3010)
npm run host -- e2e:worker:heavy # a third: the heavy role (image digest, data export), own port 3011
```

The backend only PUBLISHES jobs. With RabbitMQ configured (it is, here) nothing sends a mail, digests an image or delivers a webhook until `e2e:worker` runs (and an image digest or a data export, until `e2e:worker:heavy` does), so a spec that reads Mailpit would wait for ever. Without a broker the backend does that work inline and needs no worker.

`host` is a PREFIX runner: it points the database and Redis at 127.0.0.1 and runs whatever `npm run` script follows the `--`. Nothing waits for the backend: with none listening on `VITE_API_URL` (default `http://localhost:3000`), every spec fails on a network error rather than on anything it was written to check.

### 3. Frontend

```sh
cd boilerplate-vue-frontend
export NODE_RATE_LIMIT_REDIS_URL=redis://127.0.0.1:6379   # the same value as the backend's: the reseed clears the counters there
MAILPIT_URL=http://localhost:8025 npm run test:e2e:live
```

The run refuses to start when `NODE_RATE_LIMIT_REDIS_URL` is missing from this shell (`scripts/e2e/live-rate-limit-guard.ts`, called from `cypress.config.ts`). The reseed does warn, but `cy.exec` hides its output, so without the guard the symptom would be a 429 hours later.

Between specs `cy.restore()` runs `LIVE_RESET_COMMAND` (see [`BACKEND_PATH`](./live-e2e.md#backend-path)), which reseeds through the backend checkout. It needs the same `NODE_PSEUDONYM_KEY` and encryption keys as the running backend, so export them in this shell too, and the same `NODE_RATE_LIMIT_REDIS_URL`: the reseed is a separate process, and it clears the limiter's counters only through that URL. Do NOT export `NODE_ENV=development` here: `vite build` then makes a development bundle, which throws on a contract mismatch instead of validating like the real one. Put `NODE_ENV=development` in the backend checkout's `.env` instead, where the reseed reads it; CI puts them on the command itself.

With no `MAILPIT_URL`, the mail-driven specs report as skipped (`cy.skipUnlessMailbox()`) rather than failing. `test:e2e:live` builds the bundle with `VITE_VALIDATE_RESPONSES=true`, serves it on `:8085` with `vite preview`, then runs Cypress against it with `CYPRESS_liveProfile=true`.

Run `npm run check` alongside it when the pair has moved — a forked contract makes a live run fail on _shape_ rather than on behaviour, and that is a confusing hour if you are not expecting it. It compares the two contract bundles only; the demo dataset is not among them (see below).

### Raise the volume budgets, or the suite fails halfway through

The backend ships `NODE_RATE_LIMIT_MAX=100` per minute per IP — sized for a person browsing. This suite is not a person: 85 specs drive real page loads, real logins and real uploads from one address, and `uploads.cy.ts` alone clears 100 requests a minute on its own. Past the budget the API answers **429**, the app bounces to `/login`, and the failure reads as "login is broken" rather than "we ran out of allowance". That is a genuinely expensive hour of debugging, because every assertion downstream fails for a reason unrelated to what it was testing.

The recipe raises exactly the volume buckets: the global one (`100000` — `1000` a minute still gave 429s on login), the credential pair (per account named, per address calling), signup and password reset. They are separate buckets, so raising only the first just moves which of them the suite trips over. Only FAILED credential attempts spend the credential budgets, which is why a suite that signs in correctly on every spec still gets through. Payments, invoicing and returns stay at their defaults. Do not raise any of these in a deployed environment — the small credential budget is what makes password guessing expensive, and the buckets are deliberately decoupled so that widening one never widens the other (see `boilerplate-node-backend/src/infrastructure/http/middlewares/rate-limit.ts`).

The variables go in front of `compose:restart` when the backend runs in its container — they are declared in the backend's development compose file precisely so a run can raise them from the shell.

The counters reset on every reseed only when they live in Redis (`NODE_RATE_LIMIT_REDIS_URL`, step 2). Without it they sit in the backend process's memory, no reseed reaches them, and the payment budget (5 card confirms per account per hour, `payments` keeps its default) answers **429** to the sixth journey that pays by card as the seeded customer, so `CU20`, `CU25` and `N1` fail on a missing `payment-status`. CI sets the URL job-wide.

This covers the BROWSER's traffic only. `cy.restore()` is several hundred API requests of its own now that the backend builds its demo shop by driving it, and those are deliberately kept off these buckets entirely: the seeder counts in its own memory rather than the deployment's Redis, so it neither spends a real visitor's allowance nor inherits what one already spent. See `boilerplate-node-backend/scenarios/rate-limits.ts`.

### Why `test:e2e:live` runs on Chromium, not Cypress' default Electron

`uploads.cy.ts`'s upload-and-wait-for-the-server-image cases (`Product edit`, `Product create`,
`User create`, `Signup`, `Live backend`) crash the bundled Electron browser outright on at least one
Linux host — a deterministic `trap invalid opcode` in the Electron binary itself (confirmed by
running the spec alone, repeatedly, at the identical offset every time), not a timeout, a memory
leak, or anything in this app's own code. Real Chromium runs the same interaction without crashing.
`--browser chromium` is scoped to this one script: the demo-profile suites do not hit it (the demo
backend's upload response is faster/smaller) and stay on Electron.

A headless Chromium has no mouse, so it reports `hover: none` and no pointer, and Vuetify's touch-only
CSS (the always-visible clear "×") would render at desktop width, unlike in Electron. The one
`before:browser:launch` handler (`scripts/e2e/browser-launch.ts`) therefore launches it with Blink
pointer settings that report a hovering, fine pointer. Limit: once a test turns touch emulation off,
Chromium falls back to "no pointer", not to the flag, so put touch tests last in a spec. See
[Touch testing](./touch-testing.md).

### Point the backend at Umami, or the analytics spec fails with Umami running

`compose:restart` starts Umami on `:3080`, and the frontend's tracker finds it on its own — `VITE_UMAMI_SRC` and `VITE_UMAMI_WEBSITE_ID` in `.env-example` already name it. The **backend** is the half that does not: `NODE_UMAMI_*` is commented out there, because the compose stack sets it on the `app` service, and `npm run host` runs the backend outside that service. So a backend booted the way the recipe above describes emits nothing, logs `Analytics provider is 'umami' but ... events are being discarded`, and carries on.

That failure is quiet in the worst way. `analytics.cy.ts` asserts that ONE add-to-cart writes ONE row, and with the backend silent the frontend's own row is still written — one row, spec green, for exactly the wrong reason. Its control assertion catches the mirror case (a silent _frontend_) but nothing catches a silent backend except knowing to set these, in step 2:

```sh
export NODE_ANALYTICS_PROVIDER=umami \
       NODE_UMAMI_INGEST_HOST=http://localhost:3080 NODE_UMAMI_HOST=http://localhost:3080 \
       NODE_UMAMI_WEBSITE_ID=00000000-0000-4000-8000-000000000001
```

`INGEST_HOST` is `localhost:3080` and not the compose stack's `http://umami:3000`: that hostname resolves only from inside the job network, and `host` puts the process outside it. The website id is the fixed UUID `umami-init` stamps, and it must match the frontend's — both trackers writing into **one** website is the arrangement `analytics.cy.ts` exists to police, not an accident to tidy up.

The `test-e2e-live` CI job sets all of this itself, including the two `VITE_UMAMI_*` build variables, since a runner has no `.env`.

## Read next

- [Live E2E (FE ↔ real backend)](./live-e2e.md)
