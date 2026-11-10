---
source: tests/unit/infrastructure/http/problem.spec.ts
sha256: 8643a610f0d1cb601c2348fa4f1e6066a58e79f00443bc3dee351cf5bd52300d
signature: 83ec18d998740ba39c8c52c02de770f149ed00f9b01c30bc0d0a00408d8be2dd
generated_at: 2026-11-10T07:59:33.848069+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/problem.spec.ts

## Purpose

Unit tests for the two problem-details helpers the HTTP client uses when it did not parse a response itself: `readProblemBody` (extracts a structured problem from text, Blob, or an already-parsed object) and `syntheticProblem` (fabricates one when nothing answered, e.g. a network timeout).

## Key elements

- **`readProblemBody` tests** — five cases:
  - JSON string in `data` → parsed to the expected object.
  - `Blob` with `application/problem+json` MIME → parsed to the same object.
  - `Blob` with `text/csv` (non-problem content-type) → returned unchanged (byte-faithful).
  - Plain string that *claims* problem content-type but is not valid JSON → returned unchanged.
  - Already-parsed object → passed through by reference.
- **`syntheticProblem` test** — one case asserting the returned shape: `type: 'about:blank'`, caller-supplied `title`/`status`/`detail`, and a single-element `errors` array whose entry is `{ code, message }`.
- **`TOO_LARGE`** — fixture built via `aProblem(422, …)` representing an orders-export cap refusal; used as the expected parse target.
- **`PROBLEM_HEADERS`** — constant with the canonical `application/problem+json; charset=utf-8` header pair.

## Relationships

- **`tests/support/unit/fixtures.ts`** — provides the `aProblem` builder used to construct the `TOO_LARGE` fixture with the project's standard problem-details shape.

## Notes

- The "leaves a file alone" test is the critical guard: `readProblemBody` must *not* attempt to parse a Blob whose content-type is not `application/problem+json`, even if the bytes happen to be valid JSON. This protects file-download responses from being mangled.
- `syntheticProblem` is always called with `status: 0` in tests; the function does not derive status on its own.
- The test file uses `.then()` + `expect` rather than `await`/`expect(...).resolves`, consistent with the project's Vitest style.
