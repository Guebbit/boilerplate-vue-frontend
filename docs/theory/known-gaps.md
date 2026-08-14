# Known gaps

Things that are **deliberately not fixed yet**, each with enough context to act on later without
re-deriving it. Nothing here is a bug in the running application; everything here is a place where
the architecture is less honest than it intends to be.

Recorded 2026-08-14. If you are reading this much later, verify before acting — some of these are
the kind of thing a later change fixes by accident.

The backend keeps [its own list](https://github.com/Guebbit/boilerplate-node-backend)
at `docs/theory/known-gaps.md`. The two are separate on purpose: a gap is a property of a
codebase, not of the pair.

## 1. Four files regressed while nobody was measuring

`mutation-baseline.json` is the gate that actually bites — `stryker.config.json`'s `break` is only
a collapse detector, and the per-file ratchet is what catches a single file getting worse.

It recorded **36 files** while the `mutate` scope matched 72, because the run that feeds it had
been broken for long enough that nobody noticed (§2). The first successful run since — 2026-08-14,
2182 mutants, 18m36s — recorded **60** and immediately reported what the blind spot had been
hiding:

| File | Floor | Now |
| ---- | ----- | --- |
| `src/modules/cart/store.ts` | 85.11% | **78.43%** |
| `src/modules/products/store.ts` | 75.00% | **66.67%** |
| `src/modules/account/store.ts` | 71.93% | **69.61%** |
| `src/app/router/index.ts` | 61.25% | **55.68%** |

The ratchet did the right thing: it kept the old floors, recorded the 24 newly-seen files, and
exited 1. `npm run test:mutation:check` therefore **fails today**, correctly.

A drop means the tests stopped noticing something they used to notice — almost always new code
arriving in an existing file without assertions to match. All four were in the customer-surface
and storefront work.

**Tests have since been written against the specific survivors** — the address book and the store
id on `account`, `reorder` plus the checkout envelope's optional chaining on `cart`, the facets
loader and the created-product unwrap on `products`, and the generated static-page routes plus the
deep-404 path on the router. What has NOT happened is a mutation run to confirm they kill those
mutants; until one does, treat the four floors as unproven rather than restored.

**Some of those survivors are not meant to be killed.** `products/store.ts` hands the toolkit a
`TTL` of `5 * 60 * 1000`, and the mutants on that expression — and on the options object holding
it — are only observable by driving TanStack Query's cache, which is TanStack's suite's job. A
test written to move that score would be a test of a dependency. The floor for that file should
be read with those few mutants understood as noise rather than as debt; see the note in
`src/modules/products/tests/store.spec.ts`.

**Do not re-record these away.** Re-recording a lower floor is how the ratchet becomes decoration;
the only honest reasons are that the code was deleted or the scope changed, and then the commit
should say so.

Score at the last full run: **69.25%**, or **78.39%** over covered code.

## 2. Three ways an instrumented build breaks Vite, two of them found the hard way

`npm run test:mutation` failed in the dry run — before a single mutant was tested — for three
independent reasons at once. All three are fixed; they are recorded because each is a trap that
returns the moment someone writes the same shape again, and because the failure mode is always
the same useless message about a file that does exist.

| Cause | Symptom | Fix |
| ----- | ------- | --- |
| Stryker rewrites the literal inside `import.meta.glob()` | `RollupError: Expected ',', got '<eof>'` | `// Stryker disable next-line StringLiteral` on the glob |
| Stryker rewrites a dynamic `import()` template to `import("")`, and an empty specifier resolves to the project root | `ERR_LOAD_URL: Failed to load url .../.stryker-tmp/sandbox-XXXXXX` | same directive, on each dynamic import |
| `vitest.config.mutation.ts` cleared `test.root` by passing `root: undefined` through `mergeConfig`, which skips `undefined` keys | same `ERR_LOAD_URL` | `delete` the key after the merge |

The rule that falls out, and the thing to remember: **Vite must be able to read an import
specifier statically, and Stryker's whole job is to make literals non-static.** Any new
`import.meta.glob`, or any new dynamic `import()` built from a template, needs the directive.
`src/app/middlewares/localeChoice.ts` had it from the start and is the copy-paste source.

**This one is now guarded.** `tests/cross-cutting/mutationSafeImports.spec.ts` reads the `mutate`
scope out of `stryker.config.json`, finds every `import.meta.glob(` and every `import(` given a
template literal, and fails naming the file and line when one has no `Stryker disable` directive in
the comment block above it. It reads the scope from the config rather than repeating it, so widening
`mutate` widens the sweep in the same commit.

Two things about it are worth knowing before changing either:

- **It only flags templates and globs, and that is exact rather than approximate.** Stryker's
  `string-literal-mutator.ts` refuses to mutate a plain string parented by an `import()` call, so
  `import('./seeds.ts')` is safe and needs nothing. The template-literal branch of the same mutator
  runs with no parent check at all, and `import.meta.glob`'s argument is parented by a member
  expression rather than by `import`. Those two shapes are the whole exposure.
- **It is excluded from the mutation run itself**, in `vitest.config.mutation.ts`. Inside the
  sandbox the files it reads are Babel's instrumented output rather than this repo's source, so it
  would be asserting on where the generator chose to print a comment — and a false failure there
  aborts the dry run, which is the exact failure it exists to prevent. It kills no mutants, so
  nothing is lost.

## 3. The observability surface has no unit tests at all

Of the **254** mutants with no coverage, 187 — nearly three quarters — are three files:

| File | No-coverage mutants |
| ---- | ------------------- |
| `src/infrastructure/observability.ts` | 123 |
| `src/modules/realtime/useRealtimeObservability.ts` | 37 |
| `src/modules/admin/composables/useAdminObservability.ts` | 27 |

By area, measured 2026-08-14:

| Area | Mutants | Score |
| ---- | ------- | ----- |
| `src/kernel/**` | 75 | 81.3% |
| `src/app/**` | 205 | 74.6% |
| `src/modules/**` | 1127 | 72.3% |
| `src/infrastructure/**` | 772 | **62.2%** — 149 of them uncovered |

**The first of the three now has a suite.** `tests/unit/infrastructure/observability.spec.ts`
covers the Umami half and the unified API — config reading, one-shot script injection, the
readiness guards, every `track*` helper's event name and payload, and the branches that Faro's
absence controls. `initFaro` is deliberately still uncovered: it dynamically imports two Grafana
SDKs and hands them a real browser, so a test would either load both into jsdom or mock them until
it asserted only the shape of the mock.

**The other two now have one each**, so all three files in the table are reached:

- `src/modules/realtime/tests/useRealtimeObservability.spec.ts` mocks `createSseClient` and drives
  the wiring — which url is opened and from which variable, which store action each of the three
  event names reaches, and that the module-level `activeClient` singleton is closed exactly once
  before a second connection replaces it. Each case re-imports through `vi.resetModules()`, because
  a singleton inherited from the previous case makes the reconnect assertions pass for the wrong
  reason. The transport itself stays `tests/unit/infrastructure/createSseClient.spec.ts`.
- `src/modules/admin/tests/useAdminObservability.spec.ts` covers the composition rather than the
  bookkeeping: the audit envelope split into items and total, each fetcher's own fallback message,
  the filter payload, and that one dead endpoint still renders the panels that answered. The
  loading/error machinery belongs to `useAsyncAction` and is tested there.

The numbers in the table above predate both suites; the figures the next full run reports are the
ones to read.

They stay **in** the mutate scope deliberately. A mutant in code no test imports is reported
`NoCoverage` without running anything, so leaving it in costs nothing and is what keeps the report
honest: that zero is a standing, visible statement about what the telemetry surface is missing.

It is also why the global mutation score reads ~13 points below the covered-code score. Read the
two together — far apart means "write tests that reach the code", close together means "sharpen
the tests that already run it".

**When you fix this:** it is one finding, not scattered neglect. One session on
`infrastructure/observability.ts` moves the global number more than anything else available.

## 4. Demo scaffolding lives in the app shell

Three things exist only to demonstrate the framework, and none is marked as safe to delete:

- `src/app/counter.ts` — the Pinia counter from the Vue scaffold. Scores **0%** in the mutation
  baseline, which is correct: nothing tests it because nothing uses it in earnest.
- `src/app/middlewares/demoMiddleware.ts` — a route guard that exists to show what a guard can and
  cannot reach. Scores 50%.
- `src/app/views/Playground.vue` — the component sandbox.

They are genuinely useful in a boilerplate and genuinely noise in an application. The decision to
make is not "delete or keep" but **"where does teaching code live"** — a `demo` module that the
registry can drop in one line would answer it, and would make these three obey the same deletion
rule as every other domain instead of being permanent residents of `app/`.

Related, and cheap: two live `TODO`s, at `src/modules/account/store.ts:379` and
`src/modules/account/views/Profile.vue:232`.

## 5. `.vue` files are not mutated

`stryker.config.json` excludes `.vue` from `mutate`, and the reason is about the tool rather than
the tests: Stryker can mutate an SFC's `<script>` block but **not** its template expressions. A
`.vue` file in scope would therefore report a score implying template coverage that nobody has,
and a misleading number is worse than an absent one.

This is the one place in the config where "exclude it" beats "leave it in and report the zero",
precisely because the report would not be a zero — it would be a plausible-looking number.

**Sequenced after component tests exist.** Until then the templates are covered by Cypress and by
the accessibility and visual suites, none of which mutation testing can see.

## 6. Coverage floors and mutate scope are related but not identical

`vitest.config.ts`'s coverage thresholds and `stryker.config.json`'s `mutate` deliberately do not
match: the mutate list is the wider of the two, because a file with no coverage is free to mutate
and expensive to floor.

That is a defensible position and it is also an unwritten one — there is no single place that says
which files are supposed to be in which list, so the answer is currently "read both files and
diff them by hand". The two instruments are meant to move together as tests are added, and nothing
enforces that they do.
