# Test audit — correlated blind spots — FE rollup

The FE half of the same audit whose BE rollup lives in `boilerplate-node-backend`'s
`TEST_AUDIT_CORRELATED_BLIND_SPOTS.md` (untracked there too — kept in sync by hand for now, see
"Not done" below). Covers both FE's own P1 batches (FE-1..4) and the FE side of the cross-repo
differential (X-1, X-8) from the BE rollup.

## P1 batches — spec-vs-test, per file audited

| Batch | Scope | Rows | OK | SPEC-SILENT | TAUTOLOGY | MISMATCH-CODE | MISMATCH-TEST | MISMATCH-SPEC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FE-1 | HTTP layer & response validation | 396 | 9 | ~381 | 0 | 1 | 0 | 1 |
| FE-2 | Payments store | — | — | — | 0 | 0 | 1 | 0 |
| FE-3 | Login-view i18n | 86 | — | — | 2 | 0 | 0 | 0 |
| FE-4 | Cart quantity domain | — | — | — | 3 | 0 | 0 | 0 |

Same shape as BE: the overwhelming majority of rows are `SPEC-SILENT` because most of this layer
(URL parsing, route-table matching, env config, refresh/retry policy) is frontend-only mechanics
the OpenAPI contract never speaks to.

## Findings — status, verified against the current tree

| id | status | what |
| --- | --- | --- |
| **FE-1 row 18** | ✅ **fixed** | `ResponseReject.errors` was typed and tested as `string[]`; the contract's `ErrorResponse.errors` is `ErrorItem[]` (`{code, message}` objects). `src/types/http.ts` now declares `errors: ErrorItem[]`, every fixture in `http.spec.ts` and elsewhere uses the object shape. |
| **FE-1 row 32** | 🟡 **kept, by design** | Code+test agree an empty `errors: []` reject envelope passes through unchanged; Tier A's `minItems: 1` says that shouldn't exist. `onResponseReject` now carries a comment explaining the pass-through is deliberate (`hasOwnProperty` detection, not truthiness) — treated as an accepted MISMATCH-SPEC, not a bug. No FE action left; a real fix would be relaxing the BE contract's `minItems`, not touched here. |
| **FE-2 row 29** | ✅ **fixed** | `payments/store.spec.ts`'s decline test used to stub an undefined response and assert only `rejects.toThrow()` — passed identically for a 404, 500, or real 409 decline. Now constructs the real `409 PAYMENT_DECLINED` shape and asserts `errors: [{ code: 'PAYMENT_DECLINED' }]` specifically. |
| **FE-3 rows 37-38** | ✅ **fixed** | `login-view-i18n.spec.ts`'s expected validation message was computed via `usersSchema.safeParse(...)` — the same schema the view uses, so a wrong dictionary string would still make both sides agree. Added a literal assertion against `users/locales/{en,it}.json`'s actual `users-form.email-invalid` string alongside the existing schema-derived check. |
| **FE-4 rows 38-40** | ✅ **fixed** | `quantity.spec.ts`'s floor-clamp tests asserted against `MIN_LINE_QUANTITY`, a sibling export of the module under test, instead of the contract's literal `minimum: 1`. Now asserts the literal `1`, with a comment stating why. |

## X-1 / X-8 — the FE side of the BE rollup's cross-repo differential

| id | status | what |
| --- | --- | --- |
| **X-1** | ✅ **fixed** | `getTokenFromResponse`'s comment claimed login answers a bare `{token}`; BE's `LoginResponseEnvelope` always wraps it under `data`. Comment corrected, `auth-session.spec.ts`'s login fixture moved to the wrapped `{ data: { token } }` shape. Tolerant reader (checks top-level first, falls back to wrapped) kept as-is — it does no harm and costs nothing. |
| **X-8** | ⚠️ **stands** | `POST /cart/checkout` never driven into `CART_ADDRESS_NOT_FOUND` on the BE side (per BE rollup). Not re-verified from the FE side in this pass. |

## Not done

- **Orphaned findings still gitignored.** `reports/audit/prompt1/FE-*.findings.md` exist on disk,
  same as this repo's `.gitignore` swallowing them under the blanket `reports/*` rule (only
  `expectations.md` files are committed). Same fix needed as documented for the BE side: carve out
  `!reports/audit/` next to the existing `!reports/stryker-incremental.json` line, then commit.
- **This doc isn't kept in sync with BE's automatically.** Both rollups currently require a human
  (or a fresh audit session) to update by hand when the other side changes.
