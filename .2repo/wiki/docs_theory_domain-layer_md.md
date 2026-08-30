# docs/theory/domain-layer.md

## Purpose

Explains the `domain/` folder convention for frontend modules (what belongs there, what doesn't, how lint enforces the boundary) and clarifies the relationship between that folder, feature-based packaging, and full DDD. Exists so a contributor can decide in seconds whether a piece of logic goes in `domain/`, in the template, or in the store—without re-deriving the rule from memory.

## Key elements

- **Placement rule** — a function that takes data and returns a value, needed before an API call, lives in `src/modules/<name>/domain/`.
- **"Why it is thin here" section** — prices/totals/eligibility are API-side; a thin client domain layer is correct, not incomplete.
- **Decision flowchart** — API decides → read response; needs Vue/store/i18n → not domain; otherwise → `domain/`.
- **Worked example** — `modules/cart/domain/quantity.ts` (`steppedQuantity`, `MIN_LINE_QUANTITY`); explains the double-click clamp trap.
- **Import prohibition table** — `domain/` may not import `vue`, `pinia`, `axios`, `vue-router`, `vue-i18n`, other tiers, sibling modules, or its own module's outer files. Enforced via an ESLint block on `src/modules/*/domain/**`.
- **The floor** — a rule earns `domain/` only if it has >1 caller *or* a non-obvious failure mode; a one-liner with one caller is inlined with a comment.
- **DDD (strategic vs. tactical)** — strategic (bounded contexts, ubiquitous language, context mapping) is present; tactical (entities, value objects, aggregates, repositories) is not, and the doc says that is fine.
- **DDD vs. feature architecture** — feature packaging (where files live) is a separate, already-adopted concern from DDD modelling (what files contain).

## Relationships

- **docs/theory/index.md** — the index for the theory section; links to this page as a sub-topic.
- **docs/theory/glossary.md** — defines terms used here (bounded context, ubiquitous language, aggregate, etc.); this page assumes readers have seen those definitions.
- **docs/theory/strategic-ddd.md** — the deeper strategic-DDD companion; this page's §2–5 "mirror the API repo's page" and defer full strategic treatment there.
- **docs/theory/layers.md** — describes the tier model (kernel → infrastructure → modules → app); this page references that hierarchy when listing forbidden imports.
- **docs/modules/wishlist.md** — a concrete module; the "floor" discussion uses cart as the only module with a `domain/` folder, making wishlist a natural contrast (no domain folder expected).
- **src/modules.ts** — the source-of-truth module registry; the lint rule targets paths under `src/modules/*/domain/**` derived from this structure.
- **docs/index.md** — top-level docs entry point; routes readers to the theory section and hence to this page.

## Notes

- The folder is **optional**: only `cart` currently has one. Most modules will never need one, and that is the expected state.
- The "floor" test (multi-caller or non-obvious trap) is the real gate; "testable without mounting a component" is necessary but not sufficient and would otherwise pull every ternary into `domain/`.
- `canAccess()` in `app/guards/authentications.ts` is a pure rule that stays in `app/` because it governs the route tree, not a single domain—useful as a counter-example when deciding placement.
- The doc explicitly states that sections 2–5 mirror the API repo's same-named page; only §1 (the folder rule) is frontend-specific.
