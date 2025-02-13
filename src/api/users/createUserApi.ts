import axios from '@/utils/http.ts';
import type { IUser, IUserForm } from "@/types";

/**
 * List of users
 * @param userData
 */
export const createUserApi = (userData: IUserForm) =>
    axios.post<IUser>('/users/', userData);