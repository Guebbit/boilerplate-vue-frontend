# Over-engineered: defensive code that tests already cover

Same exercise as the backend's `OVERENGINEERED.md`, applied here. Scope: code whose main job is
protecting a developer from a configuration/wiring mistake — a duplicated module name, an unknown
dependency, a composable called out of order — where that mistake breaks loudly on the first
dev-server boot, build, or test run whether or not a guard exists to name it nicely. This does
**not** include code guarding a genuine runtime condition (a backend API being down or slow, a
malformed server response, token-refresh races, missing browser APIs) or end-user form validation —
those are real defensive programming and are excluded on purpose.

This frontend is noticeably leaner on this complaint than the backend was. Almost the entire
surface concentrates in one file, `src/kernel/registry.ts`, which is an explicit mirror of the
backend's flagged `kernel/registry.ts` — same idea, same field names, ported over.

Ranked strongest → weakest "delete this, a crash or a test will say the same thing anyway."

---

## 1. `src/kernel/registry.ts:220-263` — `validateModules`

**What's there:** duplicate-name check, unknown-dependency check, self-dependency check, and a
depth-first cycle detector with path tracking, run over `src/modules.ts` — a 43-line hand-written
file listing 13 enabled modules. Called from `collectModuleRoutes` (`registry.ts:273-276`), which
runs at module-eval time from `src/app/router/index.ts` — so on every dev-server boot, every build,
and every test that imports the router.

**Why it's ceremony, not safety:** `name` and `dependsOn` are pure metadata — grep confirms nothing
outside `registry.ts` reads either at runtime. There's no DI container, no dynamic route or store
resolution keyed by module name. A typo'd dependency or a duplicate registration would have _zero
production effect_ if this function didn't exist — it wouldn't break routing, rendering, or
navigation, because nothing downstream ever looks the value up. The only reason it's "caught loudly"
at all is this guard, and it's caught redundantly on top of that:
`tests/unit/kernel/registry.spec.ts` (212 lines) exercises the function directly with synthetic
fixtures, and `tests/cross-cutting/registry.spec.ts` (168 lines) separately asserts
`expect(() => validateModules(enabledModules)).not.toThrow()` against the real, current module
list. So the exact mistake this guards against is already caught by `npm run test` independent of
whether the boot-time call exists at all.

**Counter-consideration — the strongest one in this document:** the file's own docstring
(`registry.ts:266-269`) pre-empts this critique directly: _"Validation happens here rather than in
the router so that a misconfigured registry fails while the app is being assembled, not on the
navigation that first crosses the gap."_ That's a real, deliberate trade — failing at `npm run dev`
boot is faster feedback than waiting for a test run to catch it — not an oversight. It's still
ceremony by the letter of the complaint (a test already covers the identical failure), but it's the
one finding here made with its eyes open rather than by accident.

**Simpler version:** drop the boot-time call — `collectModuleRoutes` becomes
`appModules.flatMap((m) => m.routes)` — and keep `validateModules` only as a helper the
cross-cutting spec calls directly against `enabledModules`. The mistake is still caught, just by
`npm test` instead of also by every `npm run dev`.

---

## 2. `src/kernel/registry.ts:100-137` — `ContextRelationship` / the required `because` field

**What's there:** a 3-way discriminated union (`conformist | customer-supplier | published-language`)
plus a _required_ one-sentence `because` on every dependency edge — roughly 35 lines of docstring
justifying the taxonomy alone.

**Why it's ceremony, not safety:** nothing at runtime reads `edge.as` or `edge.because`. Their only
consumer is `tests/cross-cutting/context-map.spec.ts` (108 lines), which greps each module's source
for `@/modules/<x>` imports and cross-checks them against declared edges — a staleness/undeclared-
import check. That mechanical check works identically against a plain `dependsOn: string[]`; the
relationship-kind typing and the mandatory justification sentence add compile-time ceremony (TS
build fails without `because`) without changing what the check catches or how fast it's caught.

**Counter-consideration:** genuinely more defensible than most entries here — the taxonomy is
architecture documentation with a concrete track record (the spec's own header cites catching a
stale `cart → orders` dependency that survived for months), not purely mistake-prevention. Borderline
rather than clean-cut.

**Simpler version:** `dependsOn: string[]` (module names only); `context-map.spec.ts` does the same
import cross-check without a typed relationship taxonomy behind it.

---

## 3. `src/kernel/registry.ts:139-174` — `Subdomain` / `AppModule.subdomain`

**What's there:** a required `'core' | 'supporting' | 'generic'` classification every module must
declare.

**Why it's ceremony, not safety:** the file says so itself — _"`subdomain` is read by nothing at
runtime... A field nothing reads and nothing checks is a comment with extra syntax."_ Its only
consumer is `tests/cross-cutting/subdomain-discipline.spec.ts` (53 lines), which forbids a
`domain/` folder inside a `generic` module. This is the plainest instance in the document of "a
field exists so a test can check something a code comment already said."

**Counter-consideration:** the most self-aware finding here too — the author frames it explicitly
as moving a comment into a typed, test-checked field rather than as safety machinery. Still fits
the complaint exactly: the enforcement mechanism is entirely a test, and the field itself does
nothing.

**Simpler version:** drop the field; hardcode the `generic`-module list directly inside
`subdomain-discipline.spec.ts`, or leave the classification as a comment per module like before.

---

## 4. `src/modules/demo/provided.ts:58-65` — the guard throw in `useProvidedVariable`

**What's there:** `inject(providedVariableKey)` returns `undefined` if no ancestor called
`provideVariable()` first; the composable checks explicitly and throws a custom message naming the
file, instead of letting the subsequent destructure fail on its own.

**Why it fits:** a textbook "composable called out of order" guard. Its one caller
(`ProvidedVariableCard.vue`) only ever renders under `Playground.vue`, which always calls
`provideVariable()` first — the wiring can't drift without someone deliberately rearranging the
demo, and no test renders the card without its provider ancestor. Without the guard, the same
mistake still throws immediately on the same page load — Vue's own
`TypeError: Cannot destructure property 'providedVariable' of 'undefined'`, just with a less
specific message.

**Counter-consideration — weakest in the set:** eight lines, an idiomatic and widely-used Vue
inject/provide pattern rather than bespoke machinery, and it lives in a module that exists
specifically to demonstrate the provide/inject mechanism — arguably pedagogical, not defensive.
Worth listing for completeness rather than as a real complaint.

**Simpler version:** drop the check and let the destructure throw natively, or keep it — this one's
small enough that either choice is fine.

---

## Not included, checked and ruled out

- `src/infrastructure/http/validate.ts` + `response-schema-map.ts` — validates _live API responses_
  against contract schemas: guards a malformed or drifted server answer, a genuine runtime
  condition, not a dev mistake.
- `src/infrastructure/observability/config.ts`, `logger.ts`, `i18n/locale-overrides.ts` — plain
  `import.meta.env` reads with simple fallbacks for optional features; no elaborate coercion, no
  throws, nothing resembling the backend's `environment.ts`.
- `src/app/guards/authentications.ts`, `src/modules/demo/guards.ts` — real runtime auth-state
  guards (token expiry, unauthenticated navigation) — out of scope by the same rule as the
  backend's `managed-connection.ts`.
- Every `z.object(...)` schema under `src/modules/*/schemas.ts` and form components — end-user
  input validation, a product concern, not developer-mistake ceremony.
- `tests/cross-cutting/module-file-shapes.spec.ts` — enforces a folder-naming convention. Excluded
  because the "mistake" it catches (a stray `helpers/` file) breaks nothing at all without the
  check, loudly or otherwise — it's a style-enforcement test, not a guard with a bypassable failure
  mode.

---

## Net

Findings 1–3 are all the same file, `src/kernel/registry.ts`, and together account for nearly all
of this repo's instance of the backend's complaint — consistent with this file being an intentional
port of the backend pattern rather than an independent design. Deleting the boot-time
`validateModules` call and the `ContextRelationship`/`because`/`Subdomain` fields would let three
test files (`registry.spec.ts` × 2, `context-map.spec.ts`, `subdomain-discipline.spec.ts` — over
500 lines combined) either shrink to just the checks that remain useful or go away, since most of
what they assert is "the guard behaves correctly" against a manifest that would fail exactly as
loudly, one layer down, without it. Finding 1 is the one case in this document where the author
explicitly weighed and accepted the trade-off rather than missing it — worth knowing before cutting
it, not a reason to leave it as-is.
