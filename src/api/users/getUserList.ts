import axios from '@/utils/http.ts';
import type { IUser } from "@/types";

/**
 * List of users
 */
export const getUserList = () =>
    axios.get<IUser[]>('users');

export default getUserList;