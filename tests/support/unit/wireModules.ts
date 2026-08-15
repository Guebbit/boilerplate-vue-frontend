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
 * Not usable from a spec that calls `vi.resetModules()` — the reset gives that spec a different
 * copy of the core modules than the one imported here, so those specs re-wire inline against their
 * own freshly imported instances. `tests/unit/infrastructure/http/httpValidateResponses.spec.ts` is the
 * example.
 */
import { registerResponseSchemas } from '@/infrastructure/http/responseSchemaMap';
import { registerLocaleContributors } from '@/infrastructure/i18n';
import { collectModuleLocales, collectModuleResponseSchemas } from '@/kernel/registry';
import { enabledModules } from '@/modules';

export const wireModulesIntoCore = (): void => {
    registerResponseSchemas(collectModuleResponseSchemas(enabledModules));
    registerLocaleContributors(collectModuleLocales(enabledModules));
};
