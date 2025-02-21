import axios from '@/utils/http.ts'
import type { IUser } from '@/types'

/**
 * Edit profile data
 */
export const patchProfileApi = (userData: Partial<IUser>) =>
    axios.patch<IUser>('account', userData)