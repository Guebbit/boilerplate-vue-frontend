import axios from '@/utils/http.ts';
import type { IUser } from "@/types";

/**
 * List of users
 * @param id
 */
export const getUserByid = (id: IUser['id']) =>
    axios.get<IUser>('users/' + id);

export default getUserByid;