import axios from '@/utils/http.ts';
import type { IUser } from '@/types'

/**
 * List of users
 */
export const fetchUsersAllApi = () =>
    axios.get<IUser[]>('users/all');