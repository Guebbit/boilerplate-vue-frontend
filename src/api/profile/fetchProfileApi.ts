import axios from '@/utils/http.ts'
import type { IResponseSuccess, IUser } from '@/types'

/**
 * Get authenticated user profile data
 * Authentication through Access Token in Authentication headers
 */
export const fetchProfileApi = () =>
    axios.get<IUser, IResponseSuccess<IUser>>('account')