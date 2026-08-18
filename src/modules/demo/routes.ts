import type { RouteRecordRaw } from 'vue-router';
import { exampleGuard } from './guards.ts';

export default [
    {
        path: 'playground',
        name: 'Playground',
        // Scoped to this route rather than registered app-wide: a teaching guard has no business
        // running on every navigation in a build that keeps this module.
        beforeEnter: [exampleGuard],
        component: () => import('@/modules/demo/views/Playground.vue')
    }
] as RouteRecordRaw[];
