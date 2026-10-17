---
source: spectral.yaml
sha256: 62de513d8b39787a0951e504345b032dcbc991bf97618c06b02320b5b7ad1c75
generated_at: 2026-10-17T00:04:09.362893+00:00
model: ollama:qwen3.8:27b
---

# spectral.yaml

## Purpose

Spectral linter configuration that extends the stock `spectral:oas` ruleset with project-specific rules enforcing OpenAPI 3.1 correctness, naming conventions for operations and schemas, and parameter hygiene. It acts as the gatekeeper for `openapi.yaml` and is invoked from CI.

## Key elements

- **`extends: spectral:oas`** — inherits the standard OpenAPI ruleset as a baseline.
- **Quality gates** — `operation-operationId` and `operation-tags` promoted to `error`.
- **`duplicated-entry-in-enum: off`** — disabled to work around a Spectral 6.16 crash on `null` values in `type: [X, 'null']` unions.
- **`no-nullable-keyword`** — custom rule that errors on any `nullable` property (an OpenAPI 3.0 keyword silently ignored in 3.1).
- **`no-refs-typo`** — errors if `$refs` (plural typo) is found anywhere in the document.
- **`operation-id-no-http-verb-prefix`** / **`operation-id-camel-case`** — operationId must be camelCase and must not start with `post`, `put`, or `patch` (lowercase + capital).
- **`request-schema-no-http-verb-prefix`** / **`request-schema-pascal-case`** — `*Request` component schemas must be PascalCase and must not begin with `Post`, `Put`, `Patch`, or `Get`.
- **`response-schema-no-http-verb-prefix`** / **`response-schema-pascal-case`** — same constraints for `*Response` component schemas.
- **`parameter-name-camel-case`** — query and path parameter names must be camelCase; header parameters are explicitly excluded.

## Relationships

- **`openapi.yaml`** — the document this configuration lints. Every rule targets paths (`$.paths`, `$.components.schemas`, `$.components.parameters`) within that spec.
- **`github/workflows/ci.yml`** — invokes Spectral with this config during the CI pipeline, turning any rule violation into a failed build.

## Notes

- `delete` is intentionally **allowed** as a verb prefix (only `post`, `put`, `patch` are banned in operationIds, and `Post`/`Put`/`Patch`/`Get` in schema names). This is an explicit exception, not an oversight.
- Header parameter names are excluded from the camelCase rule because they are the literal wire header (e.g. `x-antibot-challenge-token`) and are conventionally kebab-case.
- The `duplicated-entry-in-enum` rule is off **permanently by design**, not temporarily: the comment explains that Spectral 6.16's `given` filter dereferences every visited node and crashes on `null`, and that no schema in this project has an `enum` whose duplicates would matter for codegen. Re-enabling requires verifying the Spectral version handles nulls.
