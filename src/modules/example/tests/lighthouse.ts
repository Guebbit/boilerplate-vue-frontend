/**
 * @module
 * The Lighthouse case of the example module: the one public page, a published example read by a
 * guest. See `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import type { LighthouseCase } from '../../../../tests/support/lighthouse/case';

/** The cases this module contributes. */
export const lighthouseCases: readonly LighthouseCase[] = [
    {
        // The admin's seeded published example (the backend demo scenario's pinned id).
        name: 'example/published',
        route: '/en/examples/published/65e1a0000000000000000e04'
    }
];
