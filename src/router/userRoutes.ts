import LayoutDefault from '@/layouts/LayoutDefault.vue';

export default [
    {
        path: 'users',
        name: 'UserList',
        meta: {
            layout: LayoutDefault,
        },
        component: () => import('@/views/UserList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: {
            layout: LayoutDefault,
        },
        component: () => import('@/views/User.vue'),
        props: true,
    },
]
