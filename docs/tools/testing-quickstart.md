# Testing — Quick Start

Everything you can run, what each answers, and what it costs. Start here; the pages linked from
each row go deeper.

## The 30-second version

```bash
npm run test:module -- src/modules/products   # one module, unit-level, seconds
npm run test:unit                             # every unit test
npm run test:report                           # WHERE the time and the failures are, per module
npm run complete                              # the whole gate, exactly as CI runs it
```

If you change one module, the first line is the loop you want. If a build went red and you want to
know *which domain*, the third line is the one.

## Every command, and when to reach for it

| Command | Answers | Time | Gate? |
| --- | --- | --- | --- |
| `test:module -- <path>` | Did I break the module I'm editing? | seconds | — |
| `test:unit` | Did I break a unit anywhere? | ~9s | ✅ |
| `test:unit:coverage` | …and what is still unexercised? | ~25s | ✅ |
| `test:unit:report` + `test:report` | Which module owns the failure, and where did the time go? | +1s | ✅ (prints in CI) |
| `test:e2e` | Does the app work against the real API? | ~2m | ✅ |
| `test:e2e:spec` | …just this one spec? | ~30s | — |
| `test:e2e:live` | Does the app agree with the **real backend**? | ~6m | ✅ (CI job) |
| `test:e2e:visual` | Does it still *look* right? | ~1m | ❌ by design |
| `test:mutation` | Do the tests **notice** when the source is wrong? | ~9m | ❌ nightly |
| `complete` | All of the gate, in CI's order | ~7m | — |

## Running one thing

**One module's unit tests** — the path is the filter:

```bash
npm run test:module -- src/modules/products
npm run test:module -- src/modules/cart/tests/store.spec.ts
```

**One e2e spec** — via `E2E_SPEC`, because `start-server-and-test` takes exactly three arguments
and an appended one lands in the wrong place:

```bash
E2E_SPEC=src/modules/orders/tests/e2e/orders.cy.ts npm run test:e2e:spec
E2E_SPEC='src/modules/*/tests/e2e/a11y.cy.ts' npm run test:e2e:spec
```

**Watch mode** — the runners' own flags, no script needed:

```bash
npx vitest                          # watches everything
npx vitest src/modules/products     # watches one module
```

## Reading a failure

`npm run test:report` reads the JSON a run wrote and answers the two questions a raw log cannot:

```
[test-report] 1094 tests in 72 suites — 1094 passed, 0 failed (8.6s of suite time)

  module           suites  tests  failed     time
  account               4     47       0     0.2s
  products              4     34       0     0.1s
  (infrastructure)     30    771       0     6.1s

  slowest suites
      3.2s  tests/unit/app/router/router.spec.ts

  line coverage (from coverage/lcov.info)
  module             lines   covered
  products             229     13.5%
  (infrastructure)     390     91.8%

  failures
  ✖ [orders] orderService.cancel releases the hold
      src/modules/orders/tests/unit/service-crud.test.ts
      Error: expected 2 to be 3
```

It needs a JSON report to read, which `test:unit:report` produces. Coverage rows appear only when
`coverage/lcov.info` exists — run `test:unit:coverage` first if you want them.

**A failing e2e shard** writes its full Cypress output to `reports/e2e/shard-<n>.log`. Read that
before anything else; the terminal copy can be truncated, the file cannot.

## The three e2e profiles

| Profile | Backend | Command | What it proves |
| --- | --- | --- | --- |
| **demo** | the real API, in-memory (one per shard) | `test:e2e` | The app works, flows included, against known seeds. Fast |
| **live** | the real API, fully composed | `test:e2e:live` | Everything the demo profile disables: real cache, real broker, real network |
| **visual** | the real API, in-memory | `test:e2e:visual` | The pages still look right. Answers to the machine that recorded them |

Both functional profiles run the real backend — see [The demo profile](./mocking.md) — so there
is no imitation left to disagree with it.

## Per-module suites

Three kinds of spec live inside a module, so deleting the module deletes them:

```
src/modules/products/tests/
  store.spec.ts              unit — vitest
  routes.spec.ts             unit
  seeds.spec.ts              unit
  e2e/products.cy.ts         functional e2e — in the gate
  e2e/a11y.cy.ts             accessibility sweep — in the gate
  e2e/products.visual.cy.ts  visual regression — NOT in the gate
  e2e/__snapshots__/*.png    its baselines
```

A module that serves routes **must** have an `e2e/a11y.cy.ts` —
`tests/cross-cutting/a11yCoverage.spec.ts` fails if it does not. Modules that serve no page
(`delivery`, `payments`) are exempt, because there is nothing to audit.

Adding a screen to either sweep is a line, not a file:

```ts
sweepA11y('products — public', [['products list', '/en/products']]);
sweepVisual('products', [['products-list', '/en/products', '#products-list-page']]);
```

## Updating a visual baseline

```bash
npm run test:e2e:visual            # compare; a failure writes a diff to reports/visual-diff/
npm run test:e2e:visual:update     # re-record, AFTER looking at the diff
```

Look at the diff image first. Re-recording without looking is the one thing that makes this suite
worthless — the new baseline goes into the pull request as an image, and that is where it gets
reviewed.

## Related

- [Testing](./testing-and-docs.md) — the layers and why each exists
- [The demo profile](./mocking.md) — the backend dev and e2e run against
- [Live E2E](./live-e2e.md) — the authoritative profile
- [Visual Regression](./visual-regression.md)
- [Accessibility Testing](./accessibility-testing.md)
- [Mutation Testing](./mutation-testing.md)
