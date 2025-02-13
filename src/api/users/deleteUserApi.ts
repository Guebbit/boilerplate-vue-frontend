import axios from '@/utils/http.ts';
import type { IUserIdentification } from "@/types";

/**
 * List of users
 * @param id
 */
export const deleteUserApi = (id: IUserIdentification) =>
    axios.delete('users/' + id)