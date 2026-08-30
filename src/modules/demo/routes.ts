/**
 * @module
 * Route table for the demo module: one public route, guarded by the teaching
 * `exampleGuard` so its lesson runs only while this module is kept.
 */
import type { RouteRecordRaw } from 'vue-router';
import { exampleGuard } from './guards.ts';

/**
 * Route records for the demo module, mounted under the app's module registry.
 */
export default [
    {
        path: 'playground',
        name: 'Playground',
        meta: { title: 'playground-page.page-title' },
        // Scoped to this route rather than registered app-wide: a teaching guard has no business
        // running on every navigation in a build that keeps this module.
        beforeEnter: [exampleGuard],
        component: () => import('@/modules/demo/views/Playground.vue')
    }
] as RouteRecordRaw[];
