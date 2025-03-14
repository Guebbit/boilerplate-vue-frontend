import axios from '@/utils/http.ts';
import type { IUser } from '@/types'

/**
 * Get all users
 */
export const fetchUsersAllApi = () =>
    axios.get<IUser[]>('users/all');