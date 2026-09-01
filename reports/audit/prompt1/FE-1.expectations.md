# FE-1 — Frozen expectations (blind, from Tier A spec only)

Tier A sources read: `openapi.yaml` (root, this repo — verified byte-identical to
`boilerplate-node-backend-2`'s bundle). `asyncapi.yaml` was checked and contains no
HTTP status/envelope/refresh material relevant to this batch (grep for
401/403/409/envelope/refresh returned nothing) — not used further.
`boilerplate-node-backend-2/src/modules/*/openapi.yaml` fragments were NOT opened;
the root bundle carried enough detail for this batch's questions.

No test or implementation file has been opened yet. src/ has not been opened.

## E1 — Success envelope shape
A 2xx JSON body that is not a paginated list is:
`{ success: true, status: <int>, message: <string>, data: <T> }`, `additionalProperties: false`.
Cite: `openapi.yaml:3240-3256` (`UserEnvelope`), `:4677-4693` (`AuthTokensEnvelope`),
`:4774-4790` (`RefreshTokenEnvelope`), generic shape at `:3150-3171`
(`EnvelopeSuccess`/`EnvelopeStatus`/`EnvelopeMessage`/`MessageResponse`).
`success` is a boolean literal `true` (`:3151-3153`), not merely truthy.

## E2 — Bodyless-success envelope shape (`Success` response)
Where a spec response is `$ref: '#/components/responses/Success'` (e.g. logout,
session revoke, delete operations), the body is `MessageResponse`:
`{ success: true, status: <int>, message: <string> }` — no `data` key at all.
Cite: `openapi.yaml:3049-3055`, `:3158-3171`.

## E3 — Error envelope shape
Any 4xx/5xx JSON body (401, 403, 404, 409, 500) is:
`{ success: false, status: <int>, message: <string>, errors: [{ code, message, details? }] }`,
`errors` has `minItems: 1`, `additionalProperties: false`.
Cite: `openapi.yaml:3191-3214` (`ErrorResponse`), `:3056-3091` (Unauthorized/Forbidden/
NotFound/Conflict/InternalError all `$ref` this one schema).
`success` is boolean literal `false` (`:3200-3203`).

## E4 — Validation-error envelope shape
422 responses use `ValidationErrorResponse`, structurally identical to `ErrorResponse`
(`success:false`, `status`, `message`, `errors[]` with `code`/`message`/`details?`).
Cite: `openapi.yaml:3080-3085`, `:3215-3239`.
No spec-visible field distinguishes a validation error's shape from a generic error's
shape — only the status code (422) and, informally, `errors[].code` values do.

## E5 — 401 semantics
401 (`Unauthorized`, `ErrorResponse` schema) fires on:
- missing/invalid/expired bearer token on any `security: [bearerAuth]` operation
  (near-universal — every such operation lists `401`, e.g. `openapi.yaml:118`, `:213`,
  `:691`, `:1191`, etc.);
- bad credentials on `POST /account/login` (`:1004-1020`, "Authenticates a user with
  email and password credentials" ... `401` at `:1019`);
- an invalid/absent/expired refresh cookie on `GET /account/refresh` (`:1097-1115`,
  `401` at `:1112`).
401 is NEVER listed on an operation whose `security: []` (public), e.g.
`POST /account/logout` (`:764-776`, no 401 — "Answers 200 whether or not a live
session was found").

## E6 — 403 semantics
403 (`Forbidden`, `ErrorResponse` schema) fires only on a strict subset of
authenticated (`bearerAuth`) operations — the ones gated by role/ownership, not mere
authentication. Examples: `GET /observability/health` ("Requires admin role",
`:549-563`), `DELETE /account/tokens/expired` ("Restricted to administrators",
`:1137-1148`), `POST /locales` (`:103-127`), all `/users` CRUD (`:1150-1444`).
Counter-examples where `bearerAuth` is required but 403 is NOT listed — i.e. any
authenticated user may act on their own resource, only 401 applies: `GET/PUT/DELETE
/account` (`:675-739`), `POST /account/password` (`:740-763`), `GET /account/sessions`
(`:777-796`), `/account/addresses*` (`:824-937`), `GET /cart`+mutations
(`:1896-2027` range). So: 401 = "who are you", 403 = "you are someone, but not
allowed to do this."

## E7 — 409 semantics
409 (`Conflict`, `ErrorResponse` schema) fires on a business-state conflict, never on
an auth failure. Concrete triggers found in spec prose:
- duplicate email/username on `POST /account/signup` (`:1025-1054`, 409 at `:1049`);
- deleting a still-`active` locale (`:223-250`, "Refuses with 409 while the language
  is still active... Deactivate first, then delete");
- creating a locale entry whose key already exists OR collides with an existing key
  as a prefix (`:330-367`, `:3927` fragment: "caught at WRITE time with a 409 naming
  both keys");
- re-requesting email verification when already verified (`:938-955`, 409 at `:952`);
- payment/order state races: freezing a payment intent for an order whose money
  already moved (`:2590-2615`), refunding a payment not `succeeded` (`:2656-2680`,
  "double submit refunds once and answers 409 the second time"), a declined charge
  is `409` with `errors[].code: PAYMENT_DECLINED` and is explicitly retryable by
  resubmitting payment (`:2691-2714`) — this is the ONLY place the spec says a 4xx is
  client-retryable, and it is a 409 about payment/business state, not a 401 about
  auth.

## E8 — Spec is silent on client refresh-and-retry behavior
No operation description, no schema description, and no prose anywhere in
`openapi.yaml` instructs a client to call `GET /account/refresh` and retry the
original request after receiving a 401. `GET /account/refresh` (`:1097-1115`) only
describes what refresh itself returns and how the `jwt` cookie is read
(`HttpOnly`, never in a URL/proxy-log/`Referer`); it does not say anything is
supposed to trigger it automatically. The only spec-stated client retry behavior at
all is for `409 PAYMENT_DECLINED` (E7 above), which is unrelated to 401/auth.
Any interceptor behavior that catches a 401, calls refresh, and replays the
original request is therefore a frontend-only convention with no Tier-A backing —
findings about it can only be OK (self-consistent) or SPEC-SILENT, never
MISMATCH-SPEC, since there is nothing in Tier A to mismatch against.

## E9 — Refresh response shape
`GET /account/refresh` 200 body is `RefreshTokenEnvelope`: envelope-wrapped
`{ token: <string, required>, refreshToken?: <string>, expiresIn?: <int> }`.
`token` is the only required field; `refreshToken` and `expiresIn` are optional
("if returned by backend" / no `required` entry). Cite: `openapi.yaml:4759-4790`.

## E10 — Login response shape
`POST /account/login` 200 body is `AuthTokensEnvelope` wrapping `AuthTokens`:
`{ token: <string, required>, refreshToken?: <string>, expiresIn?: <int> }` — same
shape as E9's `RefreshTokenResponse` but a distinct named schema. Cite:
`openapi.yaml:1012-1018`, `:4662-4693`.

## E11 — Envelope fields are literal, not just present
`success` is a fixed boolean per envelope family (`true` for every success schema,
`false` for every error schema) — never a computed/optional flag. `status` is a bare
`integer` with no `enum`/`const` in the schema (so the numeric HTTP status is not
contract-pinned to a literal in the body schema itself, only via which named response
— `Unauthorized`/`Forbidden`/etc. — is referenced at each status code in the path
item). Cite: `openapi.yaml:3150-3157`, `:3200-3204`.
