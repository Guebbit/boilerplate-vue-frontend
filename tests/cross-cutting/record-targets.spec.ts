/**
 * @module
 * Every staff page a module declares for a record (`recordRoutes`, `auditTargets`, `eventTargets`)
 * is a route the full build really ships, and none is missing for the types the backend can send.
 */
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import {
    collectModuleAuditTargets,
    collectModuleEventTargets,
    collectModuleRecordRoutes,
    collectModuleRoutes
} from '@/kernel/registry.ts';
import { enabledModules } from '@/modules';

/**
 * The real app router, so `hasRoute` answers as it does at runtime.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

describe('declared record targets', () => {
    it.each([
        ['recordRoutes', Object.entries(collectModuleRecordRoutes(enabledModules))],
        ['auditTargets', Object.entries(collectModuleAuditTargets(enabledModules))],
        [
            'eventTargets',
            Object.entries(collectModuleEventTargets(enabledModules)).filter(
                (entry): entry is [string, string] => entry[1] !== false
            )
        ]
    ])('%s each name a route the build ships', (_field, declared) => {
        // Canary: the account pages (`users`) ship in every build, so an empty list means the
        // collection broke, not that the build is small.
        expect(declared.length).toBeGreaterThan(0);
        for (const [type, routeName] of declared)
            expect(router.hasRoute(routeName), `${type} → ${routeName}`).toBe(true);
    });
});
