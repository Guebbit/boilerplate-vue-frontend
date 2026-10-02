---
source: spectral.yaml
sha256: d0bb158a4aa7c7ee9e8c930977970a54f3e3e554befc9ffa8c47339ad5070c9e
generated_at: 2026-10-02T11:41:54.953767+00:00
model: ollama:qwen3.8:27b
---

# spectral.yaml

## Purpose

Spectral (OpenAPI linter) configuration that enforces project-specific quality gates and naming conventions on the OpenAPI spec. It layers custom rules on top of the default `spectral:oas` ruleset to keep operation IDs, schema names, and parameter names consistent and codegen-friendly.

## Key elements

- **`extends: spectral:oas`** — inherits the standard Spectral OAS rule set.
- **Quality gates (`error`)** — `operation-operationId` and `operation-tags` are hard errors; every operation must have both.
- **`duplicated-entry-in-enum` (`off`)** — disabled to work around a Spectral 6.16 crash when visiting a `null` enum member.
- **`avoid-nullable` (`warn`)** — flags `nullable: true`; the project prefers optional properties for codegen friendliness.
- **`no-refs-typo` (`error`)** — catches the common `$refs` → `$ref` typo.
- **`operation-id-no-http-verb-prefix` / `operation-id-camel-case`** — operationId must be camelCase and must not start with `post`, `put`, or `patch` followed by an uppercase letter (e.g. `PostOrder`). Semantic verbs like `create`, `update`, `delete`, `search` are allowed.
- **`request-schema-no-http-verb-prefix` / `request-schema-pascal-case`** — `*Request` schemas must be PascalCase and must not start with `Post`, `Put`, `Patch`, or `Get`.
- **`response-schema-no-http-verb-prefix` / `response-schema-pascal-case`** — `*Response` schemas follow the same PascalCase / no-verb-prefix constraints.
- **`parameter-name-camel-case`** — query and path parameter names must be camelCase; header parameters are excluded (their `name` is the literal wire header, conventionally kebab-case).

## Relationships

- **`openapi.yaml`** — the spec this file lints. Every rule's `given` path targets nodes in that document.
- **`github/workflows/ci.yml`** — the CI pipeline invokes Spectral with this configuration as a gate on the OpenAPI spec.

## Notes

- **Spectral 6.16 `null`-enum crash:** The `duplicated-entry-in-enum` rule is intentionally disabled. Spectral 6.16's `given` filter dereferences every visited node and crashes on the `null` member of `ImageRemoval`'s `enum: [null]`. Re-enabling requires a Spectral version that handles null-only enums.
- **`delete` is a semantic verb, not an HTTP verb, in naming rules:** The `notMatch` patterns exclude `post|put|patch` (and `Post|Put|Patch|Get` for schemas) but explicitly allow `Delete`/`delete` because "delete" is a meaningful business action, not a transport-level verb.
- **`avoid-nullable` is `warn`, not `error`:** It's a codegen preference, not a correctness gate. Fixing it is expected but won't block a PR.
- **Header parameter exclusion is intentional:** Header names like `x-antibot-challenge-token` are kebab-case by HTTP convention and are not identifiers subject to the camelCase rule.
