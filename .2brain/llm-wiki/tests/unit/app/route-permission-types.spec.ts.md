---
source: tests/unit/app/route-permission-types.spec.ts
sha256: 742c2e8df1b7c19e918b2dc2896f24e3eee29156a84ac157c134b5e96ee6bd65
signature: 742c2e8df1b7c19e918b2dc2896f24e3eee29156a84ac157c134b5e96ee6bd65
generated_at: 2026-11-10T07:49:00.134259+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/route-permission-types.spec.ts

## Purpose

Compile-time type test verifying that the `RoutePermission` tuple type (imported from `@/app/guards/authentications`) correctly accepts only declared `[action, subject]` pairs and rejects any undeclared combination. The assertions are enforced by the TypeScript compiler (`vue-tsc`), not by runtime `expect()` calls.

## Key elements

- **`describe('RoutePermission')`** — Single test block; no runtime assertions carry weight. The real checks are the `@ts-expect-error` comments.
- **`declared`** — A valid `['display', 'Order']` pair assigned to `RoutePermission`, proving the type accepts legitimate combinations.
- **`wrongAction`** (`['checkout', 'Order']`) — Marked with `@ts-expect-error`; `vue-tsc` must flag this because `checkout` is not an action any rule carries on `Order`.
- **`wrongSubject`** (`['read', 'Ordr']`) — Marked with `@ts-expect-error`; `vue-tsc` must flag this because `Ordr` is not a declared subject.
- **`expect(...).toHaveLength(3)`** — A no-op runtime assertion that satisfies Vitest's requirement for at least one expectation in a test; it does not validate type behavior.

## Relationships

No graph neighbors are recorded. The sole external dependency is the type import `RoutePermission` from `@/app/guards/authentications`.

## Notes

- The test **only** passes if `vue-tsc` (or `tsc`) actually raises an error on the `@ts-expect-error` lines. If the type constraint is loosened or removed, the `@ts-expect-error` directives themselves become errors ("unused `@ts-expect-error`"), failing the build. Plain Vitest execution (`vitest run`) will pass even if the type is broken, because the runtime assertions are trivial.
- There is no runtime `can()` call; the file header comment mentions `can()` as context, but the test itself exercises only the tuple type.
- Adding or removing a declared action/subject pair in the source requires updating the expected valid/invalid examples here.
