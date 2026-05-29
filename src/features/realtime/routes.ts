import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'playground/realtime',
        name: 'RealtimePlayground',
        component: () => import('@/features/realtime/views/RealtimePlayground.vue')
    }
] as RouteRecordRaw[];
