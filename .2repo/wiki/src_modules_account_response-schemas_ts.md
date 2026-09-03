# src/modules/account/response-schemas.ts

## Purpose

Declares the response-envelope schema for every account endpoint (method + URL pattern → Zod schema) so that `infrastructure/http` can validate each HTTP response against its contract by matching the originating request. Enabling the account domain turns this validation on; deleting the folder turns it off.

## Key elements

- **`accountResponseSchemas: ResponseSchemaRoute[]`** — the sole export. A flat array of route entries covering all account endpoints (login, signup, password reset, 2FA, OAuth, sessions, addresses, account CRUD, reauth, data export, etc.). Each entry specifies `method`, a `pattern` (RegExp), and a `schema` imported from `@api/schemas`.
- **`ResponseSchemaRoute`** (imported type from `@/infrastructure/http/response-schema-map`) — the shape each row must satisfy; the two invariants (first-match-wins, keying by method+pattern) are documented on that type.

## Relationships

- **`src/modules/account/module.ts`** — registers `accountResponseSchemas` in the module manifest. The infrastructure layer reads the manifest to build its route→schema lookup table; this file supplies the account-domain rows. No other file in the account module imports this file directly.

## Notes

- **Order matters.** Lookup uses `find()` (first match wins). The `oauth/providers` row is deliberately placed *before* the generic `oauth/:provider` row; a static segment that would otherwise be swallowed by a parameterised pattern must precede it. Apply the same rule when adding new routes.
- **OAuth start/complete rows** (`GET /account/oauth/:provider` and `.../callback`) have `zod.void()` schemas and are never actually validated because they are browser navigations, not axios calls. They exist to keep the table a *complete* contract map with no silent gaps.
- **Schema source.** All schemas come from the generated `@api/schemas` package — do not define Zod schemas inline here.
