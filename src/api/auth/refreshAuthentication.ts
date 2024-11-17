import axios from "@/utils/http";

export interface IRefreshAuthenticationResponse {
    secret: string
}

/**
 * Authentication DEMO
 */
export default () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axios.get<any, IRefreshAuthenticationResponse>(import.meta.env.VITE_APP_API_URL + 'users/1', {
        headers: {
            'Accept': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/json',
        },
    })
        .then(({ secret = "secret_example" }) => {
            // Some code
            return secret;
        });
