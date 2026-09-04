# TODO — test audit follow-ups (frontend)

What survives from the spec-vs-test audit and the cross-repo differential against
`boilerplate-node-backend`. Every row below was re-verified against the current tree on
**2026-09-04** — the ones that had quietly been fixed are listed at the bottom so nobody re-opens
them.

Method and prompts: [`docs/tools/ai-auditing.md`](docs/tools/ai-auditing.md).

## Open — real frontend changes

### 1. Locale create schema over-requires (`X-3`)

`src/modules/locales/schemas.ts:40-41` — `localesLanguageSchema` requires `direction` and `active`.

The backend's `CreateLocaleRequest` requires only `[tag, name, nativeName]`: `direction` is
defaulted and `active` is `default: true`. The form therefore demands two fields the API is happy to
infer, and no test would catch the divergence because both sides of the frontend agree.

Fix: make both `.optional()`. Hand-written Zod, not generated — regeneration will not do it for you.

### 2. Locale edit schema over-requires (`X-4`)

`src/modules/locales/schemas.ts:47-49` — `localesLanguageEditSchema` extends the create schema and
overrides only `tag`, so `name`, `nativeName`, `direction` and `active` all stay required.

The backend's `UpdateLocaleRequest` has no `required:` list at all — every field is optional on
update, which is what makes a partial edit possible. Same fix, same file.

### 3. Audit-event fixture is wrong in four ways (`X-5`, `X-6`, `X-7`)

`src/modules/admin/**/use-admin-observability.spec.ts:36-42` — the `AUDIT_ITEM` literal inside
`vi.mock('@api')`:

- `actor` should be `actor_user_id`
- `createdAt` should be `timestamp`
- `id` is invented; the backend's `AuditEventItem` is `additionalProperties: false`
- required `actor_role` and `level` are missing

The display code is already correct (`AdminAuditTab.vue:85-86`) — only the fixture drifted, so the
test passes against a shape the real endpoint never returns.

Fix it **and** type the literal as the generated `AuditEventItem`. It drifted precisely because it
is an untyped object literal; typing it turns all four into compile errors and stops the recurrence.

> **Not a bug — do not "fix" it:** `AdminAuditFilters.actor` (`src/modules/admin/types.ts:34`) and
> the filter specs are correct. `actor` really is the query-parameter name; only the _response_
> field is `actor_user_id`.

## Open — needs a backend decision, not frontend code

### 4. Empty `errors: []` reject envelopes

`onResponseReject` passes an empty `errors: []` reject envelope through unchanged, and the test
agrees. Tier A says `errors` has `minItems: 1`, so that envelope should not exist.

The pass-through is deliberate — detection is by `hasOwnProperty`, not truthiness — and the code
carries a comment saying so. The real fix is relaxing `minItems` in the backend contract. Nothing to
change here unless that happens.

## Open — process

### 5. The audit prompts are duplicated by hand

`tests/audit/*.md` and `docs/tools/ai-auditing.md` exist in both repos and are kept identical by
copying. A change worth making to one is worth copying to the other, and nothing enforces that.

Live with it or fold it into the existing contract-sync pipeline — but do not let the two drift
silently, because the prompts are the only durable asset this whole exercise produces.

## Verified fixed — do not re-open

| Item          | Where it landed                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE-1 row 18` | `ResponseReject.errors` is `ErrorItem[]`; every fixture uses the object shape.                                                                       |
| `FE-2 row 29` | Payments decline test pinned to a real `409 PAYMENT_DECLINED` envelope.                                                                              |
| `FE-3`        | Login i18n asserts the literal locale string, not a value recomputed with the view's own schema.                                                     |
| `FE-4`        | Quantity floor-clamp asserts the contract literal `1`, not the module's own `MIN_LINE_QUANTITY`.                                                     |
| `X-1`         | Login fixture uses the wrapped `{ data: { token } }` envelope; the tolerant reader stays.                                                            |
| `X-8`         | Frontend side is clean: `classifyCheckoutError` maps `CART_ADDRESS_NOT_FOUND` to its own verdict, asserted in two specs. Backend side is closed too. |
