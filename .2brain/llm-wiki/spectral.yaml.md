---
source: spectral.yaml
sha256: 6b2e03b24e5ef8f710a15eb039f59a4801a9143aeb56b8a3350aeefe6c272df7
signature: 6b2e03b24e5ef8f710a15eb039f59a4801a9143aeb56b8a3350aeefe6c272df7
generated_at: 2026-11-10T02:48:45.130566+00:00
model: ollama:qwen3.8:27b
---

# spectral.yaml

## Purpose

Spectral linting configuration that enforces project-specific OpenAPI conventions on top of the shared `spectral:oas` preset. It exists to catch 3.0-to-3.1 migration mistakes, common typos, and naming inconsistencies before they reach codegen or review.

## Key elements

- **`extends: spectral:oas`** — inherits the standard OpenAPI Spectral rule set as the baseline.
- **Quality gates (`operation-operationId`, `operation-tags`)** — promoted to `error` so every operation must carry an `operationId` and at least one tag.
- **`duplicated-entry-in-enum`** — explicitly disabled; a Spectral 6.16 bug crashes on `null` union members.
- **`no-nullable-keyword`** — rejects the OpenAPI 3.0 `nullable` keyword (unknown in 3.1 / JSON Schema 2020-12); steers authors toward `type: [X, 'null']` or `oneOf`.
- **`no-refs-typo`** — flags the `$refs` misspelling (should be `$ref`).
- **`operation-id-no-http-verb-prefix` / `operation-id-camel-case`** — `operationId` must be camelCase and must not start with `post`, `put`, or `patch` followed by a capital letter (`delete` is exempt).
- **`request-schema-*` / `response-schema-*`** — enforces PascalCase and bans HTTP-verb prefixes (`Post`, `Put`, `Patch`, `Get`) on component schema names ending in `Request` or `Response`.
- **`parameter-name-camel-case`** — query and path parameter names must be camelCase; **header** parameters are excluded because their `name` is the literal wire header (kebab-case by convention).

## Relationships

- **`openapi.yaml`** — the target document. Spectral loads `openapi.yaml` and evaluates it against the rules defined here; violations surface as `error`-level diagnostics in CI or the editor.

## Notes

- Every custom rule is set to `severity: error`, not `warn`—they block the build rather than nudge.
- The `no-nullable-keyword` rule uses a deliberately empty `not: {}` schema so that *any* value under the `nullable` key fails; the intent is "this key must not exist," not "validate its shape."
- Header parameters are the one exception to the camelCase parameter rule. Do not add them to the match list.
- The `duplicated-entry-in-enum` disable is tied to a specific Spectral version (6.16). Re-enable after upgrading if the null-visit crash is fixed.
