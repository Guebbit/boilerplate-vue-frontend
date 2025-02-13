import axios from '@/utils/http.ts';
import type { IUser } from "@/types";

/**
 * List of users
 * @param id
 */
export const fetchUserByIdApi = (id: IUser['id']) =>
    axios.get<IUser>('users/' + id)