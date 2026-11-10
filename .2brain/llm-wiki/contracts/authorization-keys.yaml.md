---
source: contracts/authorization-keys.yaml
sha256: 0a81e7bb37f54238c3703c5b2cadf8c4d0c7f011dc032802a1d4a4b398a30602
signature: 0a81e7bb37f54238c3703c5b2cadf8c4d0c7f011dc032802a1d4a4b398a30602
generated_at: 2026-11-10T02:10:37.511826+00:00
model: ollama:qwen3.8:27b
---

# contracts/authorization-keys.yaml

## Purpose

Generated bundle of every permission rule and permission set in the system, spliced by `npm run regenerate` from one fragment per owning module (`src/modules/<name>/authorization.yaml`) plus a root residual for app-level `core` rules. It is the single source of truth for the action vocabulary, the rule-to-role mapping target, and the step-up/credential metadata that both Node and PHP backends consume. `--check` (wired into `complete`) fails the build if the bundle drifts from the fragments.

## Key elements

- **`actions`** — Closed vocabulary list (CASL CRUD + domain additions: `checkout`, `sweep`, `override`, `start`, `receive`, `ban`, `export`, `assign`, `display`, `admin`). No wildcards; `manage` and `write` are deliberately excluded.
- **`implies`** — Maps staff actions to the plain actions they also answer (`display → read`; `admin → update, delete`). The ability emitter uses this so one `can()` check covers both.
- **`scopes`** — `tenant` (single-shop content) and `platform` (cross-shop operational data). A caller resolves to exactly one; a rule on the other scope is never satisfied.
- **`stepUp`** — Re-authentication windows in seconds (`critical: 300`, `sensitive: 900`). A rule may carry `stepUp: critical|sensitive` to require a recent sign-in.
- **`credential`** (per-rule, absent = allowed) — Whether an API key can be minted with the rule. `stepUp`-tiered and `platform`-scope rules are never mintable.
- **`rules`** — The rule set. Each entry has `action`, `subject`, `module`, `scope`, `description`, and optional `conditions` (ABAC filter with `$caller.<field>` placeholders). No expression language; tenancy is injected by the resolver, never written here.

## Relationships

- **`api/permission-vocabulary.ts`** — Generated *from* the `actions` list via `npm run gen:api`; this file is the sole home of the vocabulary so no code types it a second time.
- **`contracts/authorization-roles.yaml`** — Roles there are lists of permission-set names declared in this file. A role is "nothing else: no level, no rank, no wildcard." Assignment validates against this file's rules, not against a free string.
- **`src/kernel/step-up.generated.ts`** — Written by `npm run regenerate` from the `stepUp` section, exposing the tier windows to the runtime without reading YAML at boot.

## Notes

- **Generated, never hand-edited.** Edit the per-module `src/modules/<name>/authorization.yaml` fragment; the bundle is a splice. Committing a hand-edit will be overwritten on the next regenerate.
- **Committed byte-identical in two boilerplate repos** (`boilerplate-node-backend`, `boilerplate-php-laravel-backend`). Excluded from Prettier and dprint for the same reason `spectral.yaml` is: two formatters over one shared artefact causes a silent fork.
- **`deletedAt: null` asymmetry** — Present on narrow reads (`read:Product`, `read:Order`) but absent on the wide staff reads (`display:*`). A soft-deleted row is hidden from the storefront audience yet still visible to staff who can restore it. Matching `null` covers both "column absent" and "set to nothing."
- **No `self` / `any` in rule names.** Own-rows semantics live in `conditions` (e.g. `userId: $caller.id`), and the distinction between "my rows" and "every row" is the *action* (`read` vs `display`), not a naming suffix.
- **Field names in conditions are the model's, not either storage's.** Each backend maps `userId` → `user_id` (or whatever its column is) on the way into a query; the shared artefact is the condition set itself.
- **Modules with no rules (`wishlist`, `account`, most of `cart`) are deliberate**, not omissions: access to one's own rows follows from being signed in, not from a role. The sole cart exception is `checkout:Cart`, which is a fact about the account (address proven) rather than the basket's contents.
