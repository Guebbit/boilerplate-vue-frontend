---
source: contracts/authorization-keys.yaml
sha256: dc8884b7391b2f33e5b12cd621b36511fba6de0ad1614e25460f71cfd254167c
generated_at: 2026-10-16T23:54:16.174061+00:00
model: ollama:qwen3.8:27b
---

# contracts/authorization-keys.yaml

## Purpose

The single, canonical catalogue of every permission rule and the action vocabulary it uses. It is a **generated bundle**: `npm run authorization:bundle` splices one fragment per owning module (`src/modules/<name>/authorization.yaml`) plus a root residual for `core` rules. It is committed byte-for-byte identical in both backend repositories so that the two codebases share one authorization source of truth without either repo's formatter mutating it.

## Key elements

- **`actions`** — The exhaustive list of verbs (CASL CRUD plus domain additions like `checkout`, `sweep`, `override`, `start`, `receive`, `ban`, `export`, `assign`, `display`, `admin`). `npm run gen:api` turns this list into `api/permission-actions.ts`; it is the one home of the vocabulary.
- **`implies`** — Maps a staff action to the plain actions it also satisfies (`display → read`; `admin → update, delete`). The ability emitter uses this so a holder of `display:Order` also passes `can('read', Order)`.
- **`scopes`** — Exactly two: `tenant` and `platform`. A caller resolves to exactly one; the invariant is that a tenant rule can never be satisfied by a platform caller and vice-versa.
- **`rules`** — The concrete permission entries. Each carries `action`, `subject`, `module`, `scope`, an optional `conditions` map (ABAC filter compiled into the query), and optional `stepUp` / `credential` flags.
- **`version`** — Schema version (currently `1`).

## Relationships

No graph neighbors are recorded for this file. It is a leaf artefact: consumed by the authorization resolver at runtime and by `npm run gen:api` at build time, but it declares no imports or dependencies on other files in the dependency graph. Its source-of-truth fragments live under `src/modules/<name>/authorization.yaml` and are stitched in only at bundle time.

## Notes

- **Do not edit directly.** Rules and sets are introduced in their owning module's fragment. `--check` (wired into `npm run complete`) fails the build if the bundle drifts from the fragments.
- **Excluded from formatters.** Both `.prettierignore` and `dprint.json` skip this file (same treatment as `spectral.yaml`) to prevent a silent fork between the two repositories.
- **`$caller.<field>` is the entire placeholder grammar.** There is no expression language. Field names are the *model's* names (e.g. `userId`), not either storage engine's column names; each backend maps them at query time.
- **Tenancy is injected, not declared.** Every tenant-scope rule implicitly carries `tenantId: $caller.tenantId` via the resolver; no rule states it and no request parameter can override it.
- **`deletedAt: null` is asymmetric by design.** It appears on narrow reads (`read:Product`, `read:Order`) but not on the wide staff reads (`display:*`). A soft-deleted row is invisible to the audience it was hidden from but visible to staff who can restore it.
- **Modules with no rules are intentional.** `wishlist`, `access`, and (mostly) `cart` declare no rules because those objects are "your own things" governed by sign-in, not by a role.
- **No wildcard of any kind.** `manage` and `write` are deliberately absent from the action list. There is no scope-wide or per-family catch-all.
- **`stepUp` and `credential` are rule-level, not route-level.** They travel with the permission so that any code path reaching that action inherits the requirement without a per-route reminder. A rule with a `stepUp` tier or `scope: platform` is never credential-mintable.
