/**
 * Populates `mockDatabase` from the enabled modules' seed contributions.
 *
 * ── Why this is not in `setup.ts` ─────────────────────────────────────────────────────────────
 * It used to be, and it silently broke every spec that mocks the HTTP transport.
 *
 * Reaching `enabledModules` means importing `@/modules`, which pulls in every `module.ts`, every
 * domain store and — through them — `@api` and `src/infrastructure/http/index.ts`. A global setup
 * file runs BEFORE the spec module is evaluated, so that whole graph was already resolved and
 * bound by the time a spec's hoisted `vi.mock('@/infrastructure/http')` registered. The generated
 * client kept its binding to the REAL `orvalMutator`, the mock never intercepted, and the store
 * specs failed with a live-transport 500 instead of the stubbed response.
 *
 * Keeping it here makes the cost opt-in: only the specs that genuinely need a populated
 * `mockDatabase` pay for the module graph, and they are also the specs that never mock the
 * transport, so the ordering problem cannot come back through them.
 *
 * Always the seed profile: the random one exists to vary Cypress runs, and a unit suite whose
 * fixtures changed per run would be unreproducible for no gain.
 *
 * @returns A promise resolving once every enabled module's collections exist on `mockDatabase`.
 */

import { collectModuleMockSeeds } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { installMockSeedBuilder } from '@mocks/mockDb.ts';

export const mockDatabaseReady = (): Promise<void> =>
    installMockSeedBuilder(() => collectModuleMockSeeds(enabledModules));
