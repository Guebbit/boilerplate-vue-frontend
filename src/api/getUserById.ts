import axios from "@/utils/http";
import { i18n } from "@/plugins/i18n";
import type { IUser } from "@/types";

/**
 * List of users
 * @param id
 */
export default (id: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axios.get<any, IUser>(import.meta.env.VITE_APP_API_URL + 'users/' + id, {
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    });
