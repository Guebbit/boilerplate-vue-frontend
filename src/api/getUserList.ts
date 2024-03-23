import axios from "@/utils/http";
import { i18n } from "@/plugins/i18n";
import type { IUser } from "@/types";

/**
 * List of users
 */
export default () =>
    axios.get<any, IUser[]>(import.meta.env.VITE_APP_API_URL + 'users', {
        headers: {
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    });