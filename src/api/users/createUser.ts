import axios from '@/utils/axios.ts';
import type { IUser, IUserForm } from "@/types";

/**
 * List of users
 * @param userData
 */
export const createUser = (userData: IUserForm) =>
    axios.post<IUser>('/users/', userData);

export default createUser;