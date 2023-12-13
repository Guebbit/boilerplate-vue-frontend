import fetchJsonWrapper from "@/utils/fetchJsonWrapper";

export interface authenticationSuccessType {
    id: number,
    username: string,
    email: string
}

/**
 * Authentication DEMO
 */
export default () =>
    fetchJsonWrapper<authenticationSuccessType>(import.meta.env.VITE_APP_API_URL + 'users/1', "GET")
        .then(({ id, username, email }) => {
            // Some code
            return {
                id,
                username,
                email
            };
        })