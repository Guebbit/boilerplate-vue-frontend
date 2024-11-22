import axios from "@/utils/http";
import type { IUser } from "@/types";

/**
 * List of users
 */
export default () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axios.get<any, IUser[]>(import.meta.env.VITE_APP_API_URL + 'users');