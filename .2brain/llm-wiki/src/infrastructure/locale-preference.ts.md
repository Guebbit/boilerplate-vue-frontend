---
source: src/infrastructure/locale-preference.ts
sha256: 8d9904e2b7f5d5d8f40aa428392e1b2df59bb3c4834118acba1e1cb818b0fff8
signature: b320c5e542dbbb5a21bcfed8b6dca35de1612f764e142abe770838f85530514f
generated_at: 2026-11-10T03:07:50.481493+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/locale-preference.ts

## Purpose

Persists a signed-in visitor's chosen language to their account record so the preference outlives the browser tab. It is deliberately best-effort and fire-and-forget: guests are a no-op, and a failed write resolves silently rather than surfacing an error the caller never asked to handle.

## Key elements

- **`persistLocalePreference(locale: string): Promise<void>`** — The sole export. Checks `useSessionStore().isAuth`; if true, issues a `PATCH` to `apiUpdateAccount({ locale })` and swallows the result (or rejection) into `Promise.resolve()`. If false, resolves immediately. Never rejects.

## Relationships

No graph neighbors. No other module in the project imports this file or is linked to it in the dependency graph.

## Notes

- **PATCH, not PUT.** The payload is `{ locale }` alone. A `PUT` would clear every omitted field per RFC 9110 §9.3.4, so the verb choice is intentional and load-bearing.
- **`isAuth` is checked here, not at the call site.** The rationale: forgetting the check at the caller would produce an anonymous `PATCH /account` → 401, which is a harder failure to debug than a silent no-op.
- **Errors are swallowed.** `.catch(() => undefined)` means a stale stored locale simply persists until the next explicit switch. No toast, no log — the trade-off is documented in the JSDoc as "the worse trade."
- **Fire-and-forget contract.** Callers are expected to invoke without `await`; the return type is `Promise<void>` only to satisfy the async signature, not to signal meaningful resolution timing.
