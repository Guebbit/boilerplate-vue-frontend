import axios from "axios";
import { i18n } from "@/plugins/i18n";
import type { UserType } from "@/types";

/**
 * List of users
 * @param id
 */
export default (id: string) =>
    axios.get<UserType>(import.meta.env.VITE_APP_API_URL + 'user/' + id, {
        headers: {
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    });