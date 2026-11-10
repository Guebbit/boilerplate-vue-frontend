---
source: contracts/permission-vocabulary.ts
sha256: d3e1866d2a170661cfb4637d5a2455487a8dcb889ab5647c07f7eef1d4fc34e4
signature: 80930c5830acae30b5a0b8da6756969c59c6958ecd8f693e62b85e6fdceadb48
generated_at: 2026-11-10T02:11:16.842852+00:00
model: ollama:qwen3.8:27b
---

# contracts/permission-vocabulary.ts

## Purpose

Generated TypeScript vocabulary that enumerates every permission action, subject, rule id, permission-set name, authorization scope, and step-up tier declared in the shared authorization keys. It exists so that the rest of the codebase can import a single source of truth for permission identifiers and their valid pairings without re-parsing YAML at runtime.

## Key elements

- **`PERMISSION_ACTIONS` / `PermissionAction`** — The 14 action verbs (e.g. `"read"`, `"checkout"`, `"ban"`, `"admin"`).
- **`PERMISSION_SUBJECTS` / `PermissionSubject`** — The 20 domain subjects (e.g. `"Product"`, `"Order"`, `"StockLevel"`, `"Example"`).
- **`PERMISSION_RULE_IDS` / `PermissionRuleId`** — All valid `"<action>:<subject>"` rule identifiers (60 entries).
- **`PERMISSION_SET_NAMES` / `PermissionSetName`** — The 47 named permission sets (e.g. `"OrderOverride"`, `"InventorySweep"`).
- **`AUTHORIZATION_SCOPES` / `AuthorizationScope`** — `"tenant"` | `"platform"`.
- **`STEP_UP_TIERS` / `StepUpTier`** — `"critical"` | `"sensitive"`.
- **`PERMISSION_PAIRS`** — A const object mapping each subject to the exact list of actions that are valid for it (e.g. `"Cart": ["checkout"]`).
- **`ActionOn<S extends PermissionSubject>`** — Generic type that resolves to the action union for a given subject via `PERMISSION_PAIRS[S]`.

## Relationships

- **`scripts/contracts/generate-permission-vocabulary.ts`** — This file is the output of that script (invoked via `npm run gen:api`). The script reads the shared authorization-keys YAML and emits the constants and types defined here. Any change to the upstream YAML must be followed by re-running the generator; this file should never be edited by hand.

## Notes

- **Do not edit manually.** The header comment and the leading `//` line both flag this as generated. The canonical source of truth is `shared/authorization-keys.generated.yaml` (the input to the generator script).
- All arrays use `as const`, so the derived types are narrow literal unions, not `string`.
- `PERMISSION_PAIRS` is the authoritative action↔subject pairing table. A rule id in `PERMISSION_RULE_IDS` is only valid if the subject's entry in `PERMISSION_PAIRS` includes that action; the two lists are kept consistent by the generator, but there is no runtime cross-check between them.
- `ActionOn<S>` is a type-level helper only; it has no runtime counterpart.
