import ErrorPageLayout from '@/layouts/ErrorPageLayout.vue';

/**
 * Error routes
 */
export default [
    {
        path: '401',
        name: '401',
        meta: {
            layout: ErrorPageLayout,
        },
        component: () => import('@/views/Error401.vue'),
    },
    {
        path: '404',
        name: '404',
        meta: {
            layout: ErrorPageLayout,
        },
        component: () => import('@/views/Error404.vue'),
    },
    {
        path: '500',
        name: '500',
        meta: {
            layout: ErrorPageLayout,
        },
        component: () => import('@/views/Error500.vue'),
    },
];