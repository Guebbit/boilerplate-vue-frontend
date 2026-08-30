# spectral.yaml

## Purpose

Spectral linting configuration for the project's OpenAPI specification. It extends the `spectral:oas` rule set and layers custom rules on top to enforce quality gates, naming conventions (camelCase operationIds, PascalCase schemas), and codegen-friendly schema design. The file exists so that spec violations are caught early—by developers locally and in CI—rather than surfacing as broken codegen or inconsistent API surfaces later.

## Key elements

- **`extends: spectral:oas`** — inherits the full standard OpenAPI rule set as a baseline.
- **Quality gates** (`operation-operationId`, `operation-tags`) — promoted to `error`; every operation must have an `operationId` and `tags`.
- **`avoid-nullable`** (warn) — flags any `nullable: true`; prefers the optional-property pattern for codegen friendliness.
- **`no-refs-typo`** (error) — catches the `$refs` typo (should be `$ref`).
- **`operation-id-no-http-verb-prefix`** (error) — rejects `operationId` values starting with `post`, `put`, or `patch` followed by a capital; semantic verbs (`list`, `create`, `delete`, `search`) are expected. `delete` is explicitly allowed.
- **`operation-id-camel-case`** (error) — enforces `^[a-z][a-zA-Z0-9]*$` on operationIds.
- **`request-schema-no-http-verb-prefix`** (error) — rejects schema keys like `PostUserRequest`; expects `CreateUserRequest`, `DeleteUserRequest`, etc.
- **`request-schema-pascal-case`** (error) — enforces `^[A-Z][a-zA-Z0-9]*Request$` on `*Request` schemas.
- **`response-schema-no-http-verb-prefix`** (error) — same verb-prefix ban for `*Response` schemas.
- **`response-schema-pascal-case`** (error) — enforces `^[A-Z][a-zA-Z0-9]*Response$` on `*Response` schemas.
- **`parameter-name-camel-case`** (error) — enforces camelCase on `components.parameters[*].name`.

## Relationships

- **`github/workflows/ci.yml`** — CI invokes Spectral using this config as a lint step on the OpenAPI spec; a rule violation at `error` severity fails the build.
- **`docs/getting-started.md`** — onboarding documentation that references the local lint workflow (installing/running Spectral) so new contributors know to validate specs before pushing.
- **`github/copilot-instructions.md`** — AI-assistant instructions that mirror the naming conventions defined here (camelCase operationIds, PascalCase schemas, no nullable) so generated code and specs stay consistent.

## Notes

- The `delete` verb is a deliberate exception in the no-verb-prefix rules: `DeleteUserRequest` / `deleteUser` are explicitly allowed, while `post`, `put`, `patch` (and their capitalized forms) are not.
- The `avoid-nullable` rule is `warn`, not `error`—existing specs with `nullable: true` won't break CI, but new ones should use the optional-property pattern.
- Schema-name rules key off the `Request` / `Response` suffix; other component schemas (e.g., `User`, `Error`) are not constrained by the PascalCase or verb-prefix rules.
