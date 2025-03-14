import axios from '@/utils/http.ts';
import type { IUser, IUserForm } from "@/types";

/**
 * Create a new user
 * @param userData
 */
export const createUserApi = (userData: IUserForm) =>
    axios.post<IUser>('/users/add/', userData);