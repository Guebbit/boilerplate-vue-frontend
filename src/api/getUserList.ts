import fetchJsonWrapper from "@/utils/fetchJsonWrapper";

/**
 * List of users
 */
export default () =>
    fetchJsonWrapper(import.meta.env.VITE_APP_API_URL + 'users', "GET")
        .then((users = []) => users);