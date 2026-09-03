# docs/api/index.md

## Purpose

Index and orientation page for the API documentation section. It summarises the contract-to-client pipeline (OpenAPI → Orval → typed axios + Zod → Pinia), lists the key rules for consuming generated code, and routes readers to the appropriate deep-dive doc based on their task.

## Key elements

- **API pipeline diagram** – Mermaid flowchart showing `openapi.yaml` → Spectral lint → Orval generation → `contracts/rest/index.ts` + `contracts/rest/schemas.zod.ts` → Pinia stores.
- **"What matters most" rules** – `openapi.yaml` is the REST source of truth; `asyncapi.yaml` is the SSE source of truth; `contracts/rest/` is read-only and overwritten by `npm run gen:api`; coordinate with backend before merging.
- **Read-by-task table** – Maps six common tasks to their target doc (OpenAPI workflow, AsyncAPI workflow, endpoints, observability, request flow, layers).
- **Consuming the generated client** – Import conventions (`@api`, `@api/schemas`) and the rule that generated functions are called inside Pinia stores, not view templates.
- **API style conventions** – Resource-oriented URLs, `{ data: T }` / `IResponseReject` envelope, auth levels (`none` → `user` → `admin`), and a note that sample entities are pattern examples, not product law.

## Relationships

- **→ `docs/api/openapi-workflow.md`** – Linked for contract changes and client regeneration.
- **→ `docs/api/asyncapi-workflow.md`** – Linked for SSE event contract changes.
- **→ `docs/api/endpoints.md`** – Linked for browsing all available endpoints.
- **→ `docs/api/observability.md`** – Linked for Admin Dashboard backend data endpoints.
- **→ `docs/theory/request-flow.md`** – Linked for FE HTTP error handling.
- **→ `docs/theory/layers.md`** – Linked for the architectural layer behind Pinia stores.

This page is purely an outward router: it references all six neighbors but is not imported by any runtime code.

## Notes

- The page explicitly states that `contracts/rest/` is regenerated wholesale (`npm run gen:api`); any manual edits there will be lost.
- Sample entities (`users`, `products`, `orders`, `cart`, `admin`) are described as *pattern examples*, not binding domain models — avoid treating them as product requirements.
- The `@api` alias is the single import entry point; direct path imports into `contracts/rest/` are discouraged.
