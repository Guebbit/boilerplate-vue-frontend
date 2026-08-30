# docs/theory/strategic-ddd.md

## Purpose

Explains how the four strategic DDD concepts — bounded context, context mapping, ubiquitous language, and subdomain distillation — are (and were) expressed in this client codebase, and why the tactical half (entities, aggregates, repositories) is deliberately absent. Serves as the architectural rationale behind module folder structure, import rules, the glossary, and the `actions` pattern.

## Key elements

- **§1 Bounded context** — one folder per module under `src/modules/`; `src/modules.ts` is the registry.
- **§2 Context map** — classifies inter-module imports into `conformist`, `customer-supplier`, and `published-language`; the live enforcement is `eslint.config.ts`'s `no-restricted-imports` rule generated from a `MODULE_EDGES` map. A prior `dependsOn` manifest field and 108-line cross-cutting spec were removed.
- **§3 Ubiquitous language** — language lives in identifiers; meaning lives in the per-module glossary. A prior `language: {}` manifest field was removed.
- **§4 Subdomain distillation** — classifies modules as `core` / `supporting` / `generic`; the rule is that `generic` modules should not carry a `domain/` folder. A prior `subdomain` manifest field and its spec were removed.
- **§5 Published language** — a module publishes only what a sibling imports; stores are published only when siblings need to mutate state.
- **"How a client asks instead of deciding"** — documents the `actions` block pattern (server computes `transitions`, `cancel`, `pay`, `refund` per caller/record) replacing client-side status comparisons.

## Relationships

- **`docs/theory/domain-layer.md`** — this page repeatedly defers to it for the *why* the client does not own entities/aggregates and for §5 (when a client *does* own rules). The two pages are meant to be read together; disagreements between them mark where the domain actually lives.
- **`eslint.config.ts`** — provides the structural enforcement for §2: a generated `no-restricted-imports` rule per module from `MODULE_EDGES`, checked on every `npm run lint`. This file documents the design rationale behind that rule.
- **`src/modules/admin/views/Admin.vue`** — `admin` is classified as a `generic` subdomain here; its barrel was removed because no sibling imports it, and the page's rule says it should not carry a `domain/` folder.
- **`docs/getting-started.md`** — entry point that orients a new reader to the module structure described in §1 before they encounter this deeper rationale.

## Notes

- The page is normative about *absence*: the strongest claims are about what the client must **not** do (no second pricing engine, no client-side status invariants, no `domain/` in generic modules).
- Several sections document **removed** manifest fields (`dependsOn`, `language`, `subdomain`) and the reasoning for removal; a future reader tempted to re-add them should read those rationale bullets.
- The subdomain table is explicitly project-specific ("this shop's answer"), not a universal rule for projects forked from this boilerplate.
- The `core` label here refers to load-bearing *screens*, not client-side logic; the page warns against reading it as license to build aggregates.
