---
source: tests/support/unit/wire-modules.ts
sha256: 1a5d4c99b26051dd1681df95aa2adc389309c3ded332ac4f3e2bfe671855abae
generated_at: 2026-10-17T02:29:30.546609+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/wire-modules.ts

## Purpose

Replicates the module-wiring that `src/main.ts` performs at boot so that unit tests run against the same locale dictionaries and (when enabled) response-schema validation as production. Without it, tests silently pass with keys rendering as their own names and unmapped responses going unvalidated.

## Key elements

- **`wireModulesIntoCore(): void`** — Sole export. Registers every enabled module's locale contributors via `registerLocaleContributors(collectModuleLocales(enabledModules))`. If `shouldValidateResponses()` returns true, fires a lazy `void loadResponseSchemas(collectModuleResponseSchemas(enabledModules))`. Deliberately synchronous; the schema load is fire-and-forget so ~90 call sites stay `void`.

## Relationships

- **All 15 account spec files** (`src/modules/account/tests/*.spec.ts`) import this helper in a `beforeAll`/setup step to ensure the core runtime has the same vocabulary and contract validation the app would at boot.
- **`@/infrastructure/http/response-schema-map`** — provides `loadResponseSchemas`, the lazy loader for the schema rows.
- **`@/infrastructure/http/validate`** — provides `shouldValidateResponses`, the gate that decides whether schemas are needed at all.
- **`@/i18n`** — provides `registerLocaleContributors`, the core hook that receives the dictionaries.
- **`@/kernel/registry`** — provides `collectModuleLocales` and `collectModuleResponseSchemas`, the pure collectors that turn the `enabledModules` array into wireable data.
- **`@/modules`** — provides `enabledModules`, the composition-root list of active modules.

## Notes

- **Not usable with `vi.resetModules()`.** A reset gives the calling spec a separate copy of the core modules, so any spec that resets must re-wire inline against its own freshly imported instances (see `tests/unit/infrastructure/http/http-validate-responses.spec.ts`).
- **Specs that assert on validation timing** (e.g. those stubbing `VITE_VALIDATE_RESPONSES=true`) must `await loadResponseSchemas` themselves before their first request; this helper intentionally does not expose a promise.
- Skipping the call does **not** throw — it degrades silently, which is the exact failure mode the helper exists to prevent.
