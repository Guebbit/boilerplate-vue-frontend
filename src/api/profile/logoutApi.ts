import axios from '@/utils/http.ts'
import type { IResponseSuccess } from '@/types'

/**
 * Login user through email and password
 */
export const logoutApi = () =>
    axios.post<undefined, IResponseSuccess<undefined>>('account/logout')