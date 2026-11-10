---
source: tests/unit/support/fixtures.spec.ts
sha256: 54435711641f5fc8764c81198126cc0a44cbe2d903d1ba57046b9b0d4f5316d0
signature: 54435711641f5fc8764c81198126cc0a44cbe2d903d1ba57046b9b0d4f5316d0
generated_at: 2026-11-10T08:23:46.101364+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/support/fixtures.spec.ts

## Purpose

Unit tests that pin down the behavioral contract of the fixture factories (`aUser`, `aShop`, `aProduct`): factories must reject values the Zod schema would refuse, must reject fields the schema does not declare, and must return the object exactly as the caller built it without silently injecting schema defaults.

## Key elements

- **`describe('fixture factories')`** – top-level suite containing four assertions.
- **`aUser({ email: 'not-an-email' })`** – asserts the factory throws on a value the contract rejects.
- **`aUser({ shoeSize: 42 } as …)`** – asserts the factory throws on a field absent from the strict schema; the `as` cast intentionally bypasses TypeScript so the runtime Zod check is what's exercised.
- **`aProduct()` → `Object.keys(product)`** – asserts no schema-default field (`requiresShipping`) is injected into the returned object.
- **`aShop().currency`** – smoke check that the factory builds a valid object with no overrides.

## Relationships

- **`tests/support/unit/fixtures.ts`** – the module under test. This spec imports `aProduct`, `aShop`, and `aUser` from it and asserts on their throw/return behavior. The factories in that file are expected to internally validate overrides against a generated Zod response schema.

## Notes

- The `as Parameters<typeof aUser>[0]` cast in the "undeclared field" test is deliberate: it silences the TS type error so the test actually exercises the runtime Zod strict-object rejection rather than failing at compile time.
- The "no schema default" test only checks one key (`requiresShipping`); it is a representative sample, not an exhaustive guarantee that *no* defaults leak.
- These tests are pure Vitest (`describe`/`it`/`expect`) with no setup, teardown, or network dependencies.
