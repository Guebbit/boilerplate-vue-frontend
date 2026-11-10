---
source: src/ui/composables/use-copy-to-clipboard.ts
sha256: c1cbc2706ca5e4dae6a6a4c083dbd93586c47075bd07ae30a27f8e84ca46000d
signature: 6368904f25fa74ad58279eeb4811ae2cfa4024fd0ff19dd32e6560e1035db398
generated_at: 2026-11-10T06:23:11.371092+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-copy-to-clipboard.ts

## Purpose
A small Vue composable that wraps a clipboard-copy operation with guaranteed user feedback: a success toast or a caller-customized danger toast. It exists so that any component copying sensitive values (secrets, bank references, request IDs) can treat "copied" vs. "not copied" as equally loud outcomes.

## Key elements
- **`useCopyToClipboard(failureKey: string)`** — The sole export. A factory that captures the active i18n (`t`) and notifications store (`addMessage`) at setup time and returns a `(text: string) => Promise<void>` function. On success it toasts the fixed key `generic.copied`; on failure it toasts the caller-supplied `failureKey` with `EToastType.DANGER`.

## Relationships
No graph neighbors. The file depends on three external packages: `vue-i18n` (i18n context), `@guebbit/js-toolkit` (`copyToClipboard`), and `@guebbit/vue-toolkit` (`EToastType`, `useNotificationsStore`).

## Notes
- The composable reads `useI18n()` and `useNotificationsStore()` **at setup time**, not per call. It must be called inside a component's `setup` (or another composition-API context) where those provide-contexts are available.
- `copyToClipboard` from the toolkit never rejects; it resolves `false` on failure (permission denied, non-secure context, missing API). The `.then` chain is safe but assumes this contract.
- The success toast key is hardcoded to `generic.copied`; only the failure message is parameterised via `failureKey`, so callers can phrase the error specifically (e.g. "the reference ID was not copied").
