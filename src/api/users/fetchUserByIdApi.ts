import axios from '@/utils/http.ts';
import type { IUser, IUserIdentification } from '@/types'

/**
 * Get target user
 * @param id
 */
export const fetchUserByIdApi = (id: IUserIdentification) =>
    axios.get<IUser>('users/details/' + id)