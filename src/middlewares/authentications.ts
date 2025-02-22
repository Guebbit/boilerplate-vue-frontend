import { storeToRefs } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { useToastStore } from '@/stores/toasts'
import { loginContinueTo } from '@/utils/helperNavigation'
import type {
    NavigationGuardNext,
    RouteLocationNormalized
} from 'vue-router'


// TODO non posso controllare se jwt token esiste perché è secure.
//  Però posso creare un cookie che semplicemente indica la presenza o meno del suddetto token (tipo isAuth)
// TODO togliere isAuth\isAdmin a resetDatabase API (è solo per test)
/**
 * Refresh the authentication if needed
 */
export const refreshAuth = async () => {
    const {
        isAuth
    } = storeToRefs(useProfileStore())
    const {
        refreshToken,
        fetchProfile
    } = useProfileStore()

    /**
     * Already logged in
     */
    if (isAuth.value)
        return

    /**
     * Not authenticated but there could be a token.
     * Try to refresh authentication before continuing
     */
    return refreshToken()
        .then(() => fetchProfile())
        // no need to handle errors, but must not block the execution
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {})
}

/**
 * Check if user is a guest
 *
 * @param to
 * @param from
 * @param next
 */
export const isGuest = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const {
        isAuth
    } = storeToRefs(useProfileStore())
    const {
        addMessage
    } = useToastStore()

    if (isAuth.value) {
        // TODO i18n
        addMessage('navigation.error-already-logged')
        next({
            name: 'Home'
        })
        return
    }

    next()
}

/**
 * Check if user is authenticated
 *
 * @param to
 * @param from
 * @param next
 */
export const isAuth = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const {
        isAuth
    } = storeToRefs(useProfileStore())
    const {
        addMessage
    } = useToastStore()

    return refreshAuth()
        .finally(() => {
            // Not authenticated, send to login
            if (!isAuth.value) {
                // TODO i18n
                addMessage('navigation.error-not-logged')
                next(loginContinueTo(to.fullPath))
                return
            }
            // Proceed if authenticated
            next()
        })
}


/**
 * Check that user is authenticated AND admin
 *
 * @param to
 * @param from
 * @param next
 */
export const isAdmin = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const {
        isAuth,
        isAdmin
    } = storeToRefs(useProfileStore())
    const {
        addMessage
    } = useToastStore()

    return refreshAuth()
        .finally(() => {
            // Not authenticated, send to login
            if (!isAuth.value) {
                // TODO i18n
                addMessage('navigation.error-not-logged')
                next(loginContinueTo(to.fullPath))
                return
            }
            // Wrong roles, send home
            if (!isAdmin.value) {
                // TODO i18n
                addMessage('navigation.error-forbidden')
                next({
                    name: 'Home'
                })
                return
            }
            // Proceed if authenticated
            next()
        })
}