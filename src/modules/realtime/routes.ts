/**
 * @module
 * Route table: a plain array of `RouteRecordRaw`, lazy-loading its one view, spliced into the app
 * router by the module registry.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The realtime module's one route: the SSE observability playground.
 */
export default [
    {
        path: 'playground/realtime',
        name: 'RealtimePlayground',
        meta: { access: 'admin', title: 'realtime-playground-page.page-title' },
        component: () => import('@/modules/realtime/views/RealtimePlayground.vue')
    }
] as RouteRecordRaw[];
