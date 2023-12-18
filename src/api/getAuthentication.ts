import axios from "axios";
import { i18n } from "@/plugins/i18n";

export interface authenticationSuccessType {
    secret: string,
    id: number,
    username: string,
    email: string
}

/**
 * Authentication DEMO
 */
export default () =>
    axios.get<authenticationSuccessType>(import.meta.env.VITE_APP_API_URL + 'users/1', {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    })
        .then(({ data: { id, username, email }}) => {
            // Some code
            return {
                secret: 'secret' + id,
                id,
                username,
                email
            };
        });