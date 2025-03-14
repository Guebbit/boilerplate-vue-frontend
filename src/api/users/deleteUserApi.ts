import axios from '@/utils/http.ts';
import type { IUserIdentification } from "@/types";

/**
 * Delete target user
 * @param id
 */
export const deleteUserApi = (id: IUserIdentification) =>
    axios.delete('users/delete/' + id)