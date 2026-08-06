# TODO

Deliberate deferrals. Each entry says what is true today, why it is acceptable for now, and
what would have to change — so picking one up does not start with re-deriving the reasoning.

## Run e2e against a production build instead of `vite dev`

**Today.** `test:e2e` starts `vite dev` and points Cypress at it. The dev server compiles each
route the first time a browser requests it, so the first assertion of a spec can be waiting on
esbuild rather than on the app. `vite.config.ts` sets `server.warmup` to pre-transform the route
views at startup, and `cypress.config.ts` raises `defaultCommandTimeout` to 15s. Both are
mitigations for the same root cause; neither removes it.

**Why it matters.** The failure mode is load-dependent, which is the worst kind: the suite is
green on a developer machine and flaky on a busy CI runner, and the failure points at whatever
selector happened to be first rather than at the compile that actually caused it.

**What to do.** Build once, then serve static files:

```
vite build   (with VITE_API_MOCK_ENABLED=true so the mock chunk is included)
vite preview --port 8085
```

Nothing is compiled during the run, so the entire class of timeout disappears, and the timeout
raises above can come back down.

**Why this is safe here.** `src/main.ts` imports the mock behind a dynamic `import()` guarded by
`import.meta.env.VITE_API_MOCK_ENABLED`, which Vite resolves at build time — so a normal
production build still drops MSW and the handlers entirely. The e2e build is a _different
artifact_ from the shipped one (it has the mocks compiled in), which is the one honest caveat:
it is much closer to production than `vite dev` is, but it is not byte-identical to what ships.

**Scope.** Four scripts read `vite dev` today — `test:e2e`, `test:e2e:random`, `test:e2e:live`,
`test:e2e:target`, plus `test:e2e:dev` for interactive use. `test:e2e:dev` should keep using
`vite dev` (HMR is the point of it); the rest should move together, along with the `e2e` job in
`.github/workflows/ci.yml`.

## Do not co-schedule the mutation and e2e jobs

Stryker saturates every core it is given. If a CI runner executes it alongside the e2e job, the
e2e job is the one that fails, with a timeout that has nothing to do with the frontend. Keep
them on separate runners (separate GitHub Actions jobs already are) — and never run
`npm run test:mutation` and `npm run test:e2e` at the same time locally.
