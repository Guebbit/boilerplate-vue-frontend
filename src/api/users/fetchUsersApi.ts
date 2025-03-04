import axios from '@/utils/http.ts';
import type { IPagination, IUser } from '@/types'

/**
 * List of users
 */
export const fetchUsersApi = (page = 1, size = 9) =>
    axios.get<IPagination<IUser[]>>('users/list/' + page + '/' + size);