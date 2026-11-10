---
source: tests/support/unit/contract-data.ts
sha256: 442984573752de786dd78c490e907208ec8d8c82497682da6940face02287462
signature: dcb23960cf8425b88db21b1fa7bac2044c66877be73a94ae6454ee32f2855a5c
generated_at: 2026-11-10T07:40:37.575844+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/contract-data.ts

## Purpose

Zod-schema-driven payload generator that introspects a Zod 4 schema's internal definition to produce one valid payload and a set of payloads that each violate exactly one constraint. It powers the form property specs (e.g. "does this form accept every legal body, and refuse each one-field-broken one?"). Forked from a BE repo and intentionally not kept in step.

## Key elements

- **`resolveContractDataSeed`** (exported) — reads `RANDOM_DATA_SEED` from env or generates a fresh value; returned once per process.
- **`validPayload(schema)` / `invalidPayloads(schema)`** — the two public entry points (documented in the module header; implementation follows the same `buildValue` path).
- **`createRandom(seed)`** — Mulberry32 PRNG factory; process-wide, seeded once via `ensureSeeded`.
- **`definitionOf(schema)`** — the single access point to Zod's private `_zod.def`, type-cast through `asStub`.
- **`isOptionalField` / `unwrapField`** — classify and peel off `optional`, `default`, and `nullable` wrappers before reading constraints.
- **`randomStringForFormat(format)`** — produces a string matching an OpenAPI `format` (`email`, `uuid`, `datetime`, `url`, …); falls back to `randomWords()`.
- **`satisfyPattern(value, checks)`** — validates a candidate string against every `regex` check; **throws** if a pattern is missing from `pattern-samples.ts` rather than returning an illegal value.
- **`clampStringLength(value, checks)`** — pads with `x` to `min_length` or slices to `max_length`.
- **`buildValue(schema)`** — recursive builder that walks the Zod definition and returns one valid value per type (`string`, `number`, `boolean`, `literal`, `null`, `enum`, `array`, `object`, wrappers).

## Relationships

- **`tests/support/stub.ts`** — imports `asStub`, the project's type-safe cast helper, to reach into Zod's private internal definition without declaring a structural type.
- **`tests/support/unit/pattern-samples.ts`** — imports `sampleForPattern`; when a field's regex has no known-good sample the generator throws, directing the developer to add one there.
- **`tests/unit/support/contract-data.spec.ts`** — the unit test file for this module (seed determinism, optional/nullability logic, format coverage).
- **`src/modules/users/tests/schemas.property.spec.ts`** — a downstream consumer that calls `validPayload` / `invalidPayloads` to drive property-based assertions against user-form schemas.
- **`tests/cross-cutting/module-map.spec.ts`** — cross-cutting spec that asserts module structure/exports align with the project's module map.

## Notes

- **Reproducibility.** The seed is printed to `console.log` (with an eslint-disable) so it survives logger mocks. Re-run with `RANDOM_DATA_SEED=<n>` to reproduce a failing run.
- **`default` ≠ `optional` in Zod 4, but both count as omittable.** The file treats them identically in `isOptionalField`. `nullable` deliberately does *not* count — a nullable field must still be present.
- **Numbers are always rounded to integers.** This is intentional: some OpenAPI `type: integer` fields lose their `.int()` in the generated Zod schema, so whole numbers satisfy both `number` and `integer` constraints.
- **Email generation rotates four shapes** (plain, plus-tagged, 8+-char TLD, subdomain) to catch hand-tightened validators that accept only `user@x.com`.
- **Ordering matters in `buildValue` for strings:** `clampStringLength` runs *before* `satisfyPattern`, because padding/truncation could otherwise break a regex match.
- **No external generator library.** The file walks Zod 4's own introspection API directly because generator libraries lag Zod majors.
