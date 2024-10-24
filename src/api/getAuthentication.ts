import axios from "axios";
import { i18n } from "@/plugins/i18n";
import type { IUser } from "@/types";

export interface IGetAuthenticationResponse extends Pick<IUser, 'id' | 'name' | 'email'> {
    secret: string
}

/**
 * Authentication DEMO
 */
export default () =>
    axios.get<IGetAuthenticationResponse>(import.meta.env.VITE_APP_API_URL + 'users/1', {
        headers: {
            'Accept': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Accept-Language': i18n.global.locale.value, // Current language
        },
    })
        .then(({ data: { id, name, email }}) => {
            // Some code
            return {
                secret: 'secret' + id,
                id,
                name,
                email
            };
        });