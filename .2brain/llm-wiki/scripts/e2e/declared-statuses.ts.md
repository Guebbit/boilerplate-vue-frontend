---
source: scripts/e2e/declared-statuses.ts
sha256: da9ed14a0cc38647f43ffb8e5deb212acf4e4244fa5af543291f6fd4bcf3569f
signature: b826589f60f094420ce0136eb2854d34edfb87401a99d8c021f381edc1de59b3
generated_at: 2026-11-10T02:31:57.085855+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/declared-statuses.ts

## Purpose

Single-purpose helper that extracts the numeric HTTP status codes an OpenAPI operation declares, so that a stubbed failure row can be validated against the contract. Prevents E2E specs from asserting responses the server could never produce (spec drift). Kept pure over the raw YAML text so it is testable without a browser.

## Key elements

- **`declaredStatuses(openApiYaml, method, pathTemplate): number[]`** — Parses the YAML string, looks up `paths[pathTemplate][method].responses`, keeps only keys matching `/^\d{3}$/` (skipping `default`, `4XX`, etc.), converts to numbers, and returns them sorted ascending. Returns `[]` when the operation is absent from the document.
- **`OpenApiPaths`** (internal interface) — Minimal structural type for the slice of the OpenAPI document this module reads (`paths → verb → responses`).

## Relationships

- **`cypress.config.ts`** — Registers a Cypress task that supplies the OpenAPI YAML text and calls `declaredStatuses`, letting E2E specs assert that a stubbed status is one the contract actually declares.
- **`tests/unit/scripts/e2e/declared-statuses.spec.ts`** — Unit suite that pins the function's behavior (filtering, sorting, missing-operation case) without a browser.
- **`tests/cross-cutting/module-map.spec.ts`** — Cross-cutting test that exercises this module as part of verifying the project's module-boundary map.

## Notes

- The function is intentionally pure (string in, number[] out). It does **not** read the file system; the caller supplies the YAML text.
- Method lookup is case-insensitive (`method.toLowerCase()`), but path template matching is exact — the caller must supply the contract's spelling (e.g. `/orders/{id}/cancel`), not a resolved URL.
- Uses `.toSorted` (ES2023) rather than mutating the array; the runtime target must support it.
