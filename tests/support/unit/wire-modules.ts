/**
 * Wire the enabled modules into the core runtime, exactly as `src/main.ts` does at boot.
 *
 * `infrastructure` cannot import `@/modules` — it is the bottom tier — so the response-schema rows and the
 * translation dictionaries are handed down by the composition root instead. Anything that
 * exercises those subsystems outside the app has to do the same, or it measures a build with one
 * module's worth of vocabulary and none of its contract validation.
 *
 * Skipping it does not crash: keys render as their own name and unmapped responses go unvalidated,
 * which is precisely the silent-pass this helper exists to prevent.
 *
 * The dictionaries wire synchronously, same as `main.ts`. The response-schema chunk loads lazily
 * (FA94/FA-D2) and — same as `main.ts` — is only requested when `shouldValidateResponses()` says
 * validation actually runs, which under Vitest's default `MODE: 'test'` it does not: this stays a
 * `(): void` on purpose so none of its ~90 call sites need to become async for a load most of them
 * never trigger. A spec that stubs `VITE_VALIDATE_RESPONSES=true` and asserts on validation timing
 * needs the rows in place before its first request, so it awaits `loadResponseSchemas` itself
 * instead of this helper — `tests/unit/infrastructure/http/response-schema-map.spec.ts` and
 * `http-validate-responses.spec.ts` are the two examples.
 *
 * Not usable from a spec that calls `vi.resetModules()` — the reset gives that spec a different
 * copy of the core modules than the one imported here, so those specs re-wire inline against their
 * own freshly imported instances. `tests/unit/infrastructure/http/http-validate-responses.spec.ts` is the
 * example.
 */
import { loadResponseSchemas } from '@/infrastructure/http/response-schema-map';
import { shouldValidateResponses } from '@/infrastructure/http/validate';
import { registerLocaleContributors } from '@/i18n';
import { collectModuleLocales, collectModuleResponseSchemas } from '@/kernel/registry';
import { enabledModules } from '@/modules';

export const wireModulesIntoCore = (): void => {
    registerLocaleContributors(collectModuleLocales(enabledModules));
    if (shouldValidateResponses()) {
        void loadResponseSchemas(collectModuleResponseSchemas(enabledModules));
    }
};
