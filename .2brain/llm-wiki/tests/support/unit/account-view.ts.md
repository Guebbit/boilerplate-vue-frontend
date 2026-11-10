---
source: tests/support/unit/account-view.ts
sha256: 5415bf0e18a44520cb1d1dfe92b3cb21d7f16805ea5bdf1949fcd92cc523d024
signature: 203fadafe8e510ea65932382ab0086273696d53dcded3efbf1ef284861279330
generated_at: 2026-11-10T07:39:24.936455+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/account-view.ts

## Purpose

Test-support fixture that produces the same shape the server returns for `GET /account` (or at sign-in): the account record plus packed CASL abilities and an idle-clock timestamp. Specs import it instead of hand-rolling the response object, ensuring the `abilities` envelope is always well-formed.

## Key elements

- **`CUSTOMER_RULES`** – `unknown[]` constant holding the two CASL permission rules most account specs grant a signed-in customer: `read Product` (active, not deleted) and `read Order` (scoped to `userId: 'u1'`, not deleted). Serves as the default `tenant` rule-set.
- **`accountView(user, tenant?)`** – Generic helper. Spreads the caller's account record and appends:
  - `abilities` – `{ platform: [], tenant, version: 36, grantableRoles: [], secondFactorRequired: false }`
  - `activity` – `{ lastActiveAt: '2026-01-01T00:00:00.000Z' }` (fixed clock)

## Relationships

- **Account test specs** (`auth-login-mfa`, `auth-login-restore`, `auth-session`, `auth-signup`, `profile-*`, `two-factor-store`) – consume `accountView` to shape mock `GET /account` responses and pass `CUSTOMER_RULES` (or a variant) as the `tenant` parameter when a spec needs different permissions.
- **Infrastructure specs** (`http-validate-responses`, `session`) – the doc comment notes the session store unpacks the packed rules via CASL's own reader; these specs exercise that path against the shape produced here.

## Notes

- The `tenant` parameter defaults to `CUSTOMER_RULES`, but the function's signature accepts `unknown[]`, so specs can pass any packed-rule array without a type mismatch.
- `abilities.version` is hardcoded to `36` – a CASL policy-version pin. If the library bumps its serialization version, this fixture will silently disagree with production output.
- `activity.lastActiveAt` is a fixed 2026 timestamp; any spec asserting on relative time must override it by spreading the result.
