import axios from '@/utils/http.ts'
import type { IUser } from '@/types'

/**
 * Edit profile data
 */
export const patchProfileApi = () =>
    axios.get<IUser>('users/1')