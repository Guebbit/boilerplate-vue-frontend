# src/modules/feedback/response-schemas.ts

## Purpose

Declares the response-validation schema table for every feedback endpoint the module calls. Each row pairs an HTTP method and a URL regex with the `@api/schemas` envelope type that validates a successful response, so the HTTP layer can pick the correct schema at runtime.

## Key elements

- **`feedbackResponseSchemas: ResponseSchemaRoute[]`** — The single export. An ordered list of five rows covering `POST /feedback/contact`, `GET /feedback`, `POST /feedback/search`, `PUT /feedback/:id`, and `DELETE /feedback/:id`. The `:id` rows use the `[^/]+` regex wildcard.

## Relationships

- **`src/modules/feedback/module.ts`** — Registers `feedbackResponseSchemas` into the module manifest; this file is the data source that module reads.
- **`@api/schemas`** (imported) — Supplies the concrete schema objects (`CreateFeedbackRequestResponse`, `ListFeedbackRequestsResponse`, `SearchFeedbackRequestsResponse`, `UpdateFeedbackRequestStatusResponse`, `DeleteFeedbackRequestResponse`) referenced by each row.
- **`@/infrastructure/http/response-schema-map`** (imported as type) — Provides the `ResponseSchemaRoute` shape that every row must satisfy.

## Notes

- The `POST /feedback/search` row exists as a "DTO spelling" of `GET /feedback`: the backend moved filter params from a JSON body to a dedicated route because browsers can't send a body on GET.
- A commented-out row (static `search` segment) was considered but is intentionally absent — `search` would be swallowed by the `[^/]+` wildcard used for the by-id routes, and the only wildcard match in flight is `PUT`.
- Row order matters only insofar as the matcher picks the first hit; static segments (`/contact`, `/search`) are listed before the wildcard rows to avoid shadowing.
