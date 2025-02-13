import { createRouter, createWebHistory, RouterView } from 'vue-router'
import { demoMiddleware } from '@/middlewares/demoMiddleware'
import { localeChoice } from '@/middlewares/localeChoice'
import { isAuth } from '@/middlewares/authentications.ts'
import { getDefaultLocale } from '@/plugins/i18n.ts'

import userRoutes from './userRoutes'
import accountRoutes from './accountRoutes'

import HomeView from '@/views/Home.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_APP_BASE_URL as string | undefined),
    routes: [
        {
            path: '/:locale?',
            component: RouterView,
            beforeEnter: [
                demoMiddleware
            ],
            children: [
                {
                    path: '',
                    name: 'Home',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    component: HomeView
                },
                {
                    path: 'restricted',
                    name: 'Restricted',
                    // route level code-splitting
                    // this generates a separate chunk (About.[hash].js) for this route
                    // which is lazy-loaded when the route is visited.
                    component: () => import('@/views/Restricted.vue'),
                    beforeEnter: [isAuth]
                },

                ...userRoutes,
                ...accountRoutes,

                {
                    path: 'error/:status',
                    name: 'Error',
                    // route level code-splitting
                    // this generates a separate chunk (About.[hash].js) for this route
                    // which is lazy-loaded when the route is visited.
                    component: () => import('@/views/Error.vue')
                },

                /**
                 * Catch all route for all wrong routes
                 */
                {
                    path: '/:catchAll(.*)',
                    redirect: {
                        name: 'Error',
                        params: {
                            status: 404,
                            message: 'WRONG ROUTE'
                        }
                    }
                }
            ]
        },

        /**
         * Catch if a route doesn't have the locale and assign one
         */
        {
            path: '/:catchAll(.*)',
            redirect: `/${getDefaultLocale()}/`
        }
    ]
})

/**
 * Global error handler
 */
router.onError((error: Error) => {
    console.error('ERRORRRRRRRRRRRRRRRR', error)
    return router.push({
        name: 'Error',
        params: {
            status: 500,
            message: error.message
        }
    })
})

/**
 * Global guards
 *  - beforeEach
 *  - beforeResolve
 *  - afterEach
 */
router.beforeEach((to, from, next) => {
    console.log(`Navigating from ${from.path} to ${to.path}`)
    next()
})

/**
 * Check that requeste locale is supported and loadeds
 */
router.beforeResolve(localeChoice)

export default router
