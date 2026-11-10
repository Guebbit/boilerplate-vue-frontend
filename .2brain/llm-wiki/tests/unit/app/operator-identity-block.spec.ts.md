---
source: tests/unit/app/operator-identity-block.spec.ts
sha256: fed2633fef0cb829a94453fb6717b758ec7f57d48a64d54431c96a9f029b76d7
signature: f9dfc836460e53df422beab96a69fe8fc48b1a1abebbff46f5bbca6153d6b797
generated_at: 2026-11-10T07:47:59.012523+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/operator-identity-block.spec.ts

## Purpose

Unit tests for the `OperatorIdentityBlock` Vue component, verifying its e-Commerce Directive Art. 5 display contract: the block renders nothing until config is loaded, always shows the required operator fields (legal name, address, email), and conditionally shows phone, VAT number, trade register, and registration number only when the operator actually has them.

## Key elements

- **`answerConfig(answer)`** — Sets the value of the mocked `publicConfig` ref so the component sees a given config (or `undefined`).
- **`REQUIRED`** — Object holding the six mandatory operator fields (`legalName`, `street`, `city`, `zip`, `country`, `email`) used as the base for every test fixture.
- **`operatorAnswers(extra)`** — Spreads `REQUIRED` plus caller-supplied optional fields into a `configAnswer({ operator: … })` payload and pushes it into the mock.
- **`renderedText()`** — Mounts `OperatorIdentityBlock` (with Vuetify + i18n plugins), flushes promises, and returns the text of the `[data-test="operator-identity"]` element.
- **`vi.mock('@/infrastructure/config.ts')`** — Replaces the real module with a mutable `ref()` and no-op `loadConfig`/`resetConfig`, allowing per-test config injection.
- **Four `it` blocks** — Cover: empty config → no element; required fields rendered; optional fields rendered when present; optional fields absent when missing.

## Relationships

- **`tests/support/unit/config-answer.ts`** — Supplies the `configAnswer` factory that builds a well-shaped config object. The test file calls it to produce the value assigned to the mocked `publicConfig`, so the fixture shape stays in sync with the real config contract defined in that support module.

## Notes

- The mock replaces `publicConfig` with a plain writable `ref`, whereas the real export is a readonly view; the `answerConfig` helper casts through `Ref<unknown>` to sidestep the type mismatch.
- `beforeEach` resets `publicConfig` to `undefined` *and* loads the English locale, so every test starts from a clean, known i18n state.
- Assertions are text-based (substring `toContain` / `not.toContain`) against the rendered content rather than structural DOM checks, so label wording changes (e.g., "VAT number" → "VAT No.") will fail tests even if the logic is correct.
