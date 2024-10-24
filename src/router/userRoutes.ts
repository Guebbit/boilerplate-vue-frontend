import DefaultLayout from '@/layouts/DefaultLayout.vue';

export default [
    {
        path: 'users',
        name: 'UserList',
        meta: {
            layout: DefaultLayout,
        },
        component: () => import('@/views/UserList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: {
            layout: DefaultLayout,
        },
        component: () => import('@/views/User.vue'),
        props: true,
    },
]
