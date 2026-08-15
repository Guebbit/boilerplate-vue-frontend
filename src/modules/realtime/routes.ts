import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'playground/realtime',
        name: 'RealtimePlayground',
        meta: { access: 'admin' },
        component: () => import('@/modules/realtime/views/RealtimePlayground.vue')
    }
] as RouteRecordRaw[];
