import axios from "axios";
import { i18n } from "@/plugins/i18n";
import type { userType } from "@/types";

/**
 * List of users
 */
export default () =>
    axios.get<userType[]>(import.meta.env.VITE_APP_API_URL + 'users', {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    })
        .then(({ data = [] }) => data);