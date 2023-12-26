import axios from "@/utils/http";
import { i18n } from "@/plugins/i18n";
import type { UserType } from "@/types";

/**
 * List of users
 */
export default () =>
    axios.get<any, UserType[]>(import.meta.env.VITE_APP_API_URL + 'users', {
        headers: {
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    });