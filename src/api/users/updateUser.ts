import axios from '@/utils/http.ts';
import type { IUser, IUserForm } from "@/types";

/**
 * Update target user
 *
 * @param id
 * @param userData
 */
export const updateUser = (id: IUser["id"], userData: Partial<IUserForm>) =>
    axios.put<IUser>('users/' + id, userData);

export default updateUser;