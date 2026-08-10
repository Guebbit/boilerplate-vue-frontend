import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'playground/realtime',
        name: 'RealtimePlayground',
        component: () => import('./views/RealtimePlayground.vue')
    }
] as RouteRecordRaw[];
