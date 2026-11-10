---
source: src/modules/users/tests/schemas.property.spec.ts
sha256: a101049b54241ca9f4444f056fc0415b54cb00f19a92c8a221005bd4bfaf3796
signature: 25b3973e003f224db4be0757cb6d1b71926b53fe3f11167f2bd17067017b0778
generated_at: 2026-11-10T06:07:11.611613+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas.property.spec.ts

## Purpose

Property-based test that verifies `usersSchema` (the user form's validation) is a correct subset of the API contract `CreateUserBody`: it accepts every body the contract accepts, and rejects every contract-invalid body whose violation falls on a field the form validates. Payloads are generated from the Zod schema at runtime, so the test tracks contract changes automatically.

## Key elements

- **`VALIDATED_FIELDS`** — `Set(['email', 'username'])`. The only fields the user form validates itself; all other contract fields are passed through unchecked. Used to filter which invalid payloads the rejection test asserts on.
- **`"accepts every body the contract accepts"`** — Iterates `PROPERTY_RUNS` times, calls `validPayload(CreateUserBody)` each round, and asserts `usersSchema.safeParse(body).success === true`.
- **`"refuses each body the contract refuses because of a field the form validates"`** — Iterates `Math.min(PROPERTY_RUNS, 25)` times. Each round calls `invalidPayloads(CreateUserBody)`, filters to `VALIDATED_FIELDS`, asserts at least one case exists, then asserts `usersSchema` rejects each filtered payload.

## Relationships

- **`src/modules/users/schemas.ts`** — Source of `usersSchema`, the Zod schema under test.
- **`tests/support/unit/contract-data.ts`** — Provides `validPayload` and `invalidPayloads`, which generate payloads (and per-field violation metadata) from the `CreateUserBody` Zod schema.
- **`tests/support/unit/knobs.ts`** — Provides `PROPERTY_RUNS`, the iteration count for the property loops.
- **`@api/schemas`** (external) — Source of the `CreateUserBody` type passed into the payload generators.

## Notes

- The rejection test caps iterations at `Math.min(PROPERTY_RUNS, 25)` rather than the full count, since each round generates multiple invalid payloads and the per-round cost is higher.
- Each rejection round draws a **fresh valid base**, so the single broken field is the only deviation — this isolates the cause of rejection to that field's validation rule.
- The doc-comment references `RANDOM_DATA_SEED` and `TEST_PROPERTY_RUNS`, but the code actually reads `PROPERTY_RUNS` from `knobs.ts`. If renaming knobs, update the header comment.
- The test does **not** assert rejection for contract fields the form does not validate (e.g. `role`); that is intentional and scoped by `VALIDATED_FIELDS`.
