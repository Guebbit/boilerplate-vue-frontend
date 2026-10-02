---
source: src/modules/api-keys/schemas.ts
sha256: 0eaf430a92a7e5da48ab89f96f8f9477696dcfd34b2a74ef823c1572f2a1ef32
generated_at: 2026-10-02T12:41:21.072182+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/schemas.ts

## Purpose

Defines the Zod validation schema for the API-key mint (creation) form. Splits the object into per-field schemas so each can carry its own i18n-thunked error messages, then composes them into a single exported `apiKeyCreateSchema`.

## Key elements

- **`apiKeyNameSchema`** – Required non-empty string, upper-bounded by `mintApiKeyBodyNameMax` (imported from the API contract rather than re-stated locally).
- **`apiKeyPermissionsSchema`** – `string[]` with a minimum length of 1 (at least one permission key must be selected).
- **`apiKeyExpiresAtSchema`** – Optional ISO date string; a `.refine` rejects values that resolve to a moment in the past.
- **`apiKeyCreateSchema`** *(exported)* – `z.object` combining the three fields above into the form-level schema.

## Relationships

No graph neighbors are recorded for this file. It does import `translate` from `@/i18n` and `mintApiKeyBodyNameMax` from `@api/schemas`, but neither appears in the dependency graph for this node.

## Notes

- **i18n at parse time, not definition time.** Every `error` entry is a zero-arg thunk (`() => translate('…')`), so the translation key is resolved when `.parse()` runs, not when the module is first evaluated. This avoids capturing a locale string at import time.
- **Client-only guard on `expiresAt`.** The server contract accepts a past date and will mint a credential that is already expired; the `.refine` floor exists purely as a pre-flight check before the round-trip. Do not treat it as a server-enforced invariant.
- **Contract-bound coupling.** The name max-length is imported from the API contract (`mintApiKeyBodyNameMax`). If that constant changes, the schema follows automatically—there is no local magic number to keep in sync.
