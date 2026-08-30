# src/modules/account/response-schemas.ts

## Purpose

Declares the complete list of response-envelope schemas for every account-domain HTTP endpoint. Each entry pairs an HTTP method with a URL regex and a Zod (or equivalent) schema so the `infrastructure/http` layer can validate a live response against the expected contract. The array is registered through the module manifest, making validation toggleable by simply enabling or removing the account module.

## Key elements

- **`accountResponseSchemas`** (`ResponseSchemaRoute[]`) — the sole export. An 18-entry array covering all account routes: delete account (incl. confirm), login, signup, password reset (incl. confirm), delete expired tokens, update account, change password, logout, list/revoke sessions, email verification (request + confirm), and CRUD on addresses.
- **`ResponseSchemaRoute`** (imported type) — the shape each row must satisfy: `{ method, pattern, schema }`. The type's doc comment (referenced in the JSDoc) is the single source of truth for the two invariants every row obeys.
- **`@api/schemas`** (imported namespace) — provides every named response schema (e.g. `LoginResponse`, `GetAddressesResponse`). This file only *maps* them to routes; it defines none.

## Relationships

- **`src/modules/account/module.ts`** — the module manifest imports `accountResponseSchemas` and registers it into the HTTP layer's global schema map. Removing or disabling the account module removes these 18 contracts from validation with no other changes required.

## Notes

- URL patterns use anchored regexes (`^…$`). Parameterized segments (session ID, address ID) are matched with `[^/]+` rather than named groups; the matcher in `infrastructure/http` is responsible for capturing any path params.
- The two rows that could be ambiguous by path alone are disambiguated by method: e.g. `POST /account/addresses` (create) vs `PUT /account/addresses/:id` (update) vs `DELETE /account/addresses/:id` (remove).
- Adding a new account endpoint requires two steps: add its schema to `@api/schemas` **and** add a row here. Forgetting the second step means the response will pass through unvalidated.
