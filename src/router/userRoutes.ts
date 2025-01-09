import LayoutDefault from '@/layouts/LayoutDefault.vue';

export default [
    {
        path: 'users',
        name: 'UserList',
        meta: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            layout: LayoutDefault,
        },
        component: () => import('@/views/UserList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            layout: LayoutDefault,
        },
        component: () => import('@/views/User.vue'),
        props: true,
    },
]
