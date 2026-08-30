# src/modules/feedback/response-schemas.ts

## Purpose

Declares the response-validation schema table for every feedback endpoint the module calls. Each row pairs an HTTP method and URL regex with the corresponding schema from `@api/schemas`, so the response-envelope middleware can look up the correct validator by matching an incoming response's request.

## Key elements

- **`feedbackResponseSchemas: ResponseSchemaRoute[]`** — The sole export. A 4-row table:
  - `POST /feedback/contact` → `CreateFeedbackRequestResponse`
  - `GET /feedback` → `ListFeedbackRequestsResponse`
  - `POST /feedback/search` → `SearchFeedbackRequestsResponse`
  - `PUT /feedback/{id}` → `UpdateFeedbackRequestStatusResponse`
- **`ResponseSchemaRoute`** (type import) — The row shape `{ method, pattern, schema }`; its contract lives in `@/infrastructure/http/response-schema-map`.
- **`schemas`** (import) — All schema definitions come from the shared `@api/schemas` package.

## Relationships

- **`src/modules/feedback/module.ts`** — Registers `feedbackResponseSchemas` in the module manifest so the HTTP layer can wire it into response validation. This file is a passive data table; all runtime behavior lives in the module and the infrastructure layer.

## Notes

- **Row order matters.** The `POST /feedback/search` row must precede any future `[^/]+` wildcard on the same method, because a by-id regex would otherwise swallow the literal `search` segment. Today the only wildcard row is `PUT`, so the ordering constraint is latent, but adding a `GET /feedback/{id}` or a second `POST` wildcard would require re-ordering.
- **`POST /feedback/search` is a browser-compatibility workaround.** Filters that used to travel in a `GET` body were moved to a `POST` because browsers cannot attach a body to a GET. The response envelope is identical to the `GET /feedback` row.
- **Patterns are fully anchored** (`^…$`), so partial matches are impossible; the middleware can rely on a single exact hit per request.
