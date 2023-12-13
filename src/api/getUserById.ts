import fetchJsonWrapper from "@/utils/fetchJsonWrapper";

/**
 * List of users
 */
export default (id: string) =>
    fetchJsonWrapper(import.meta.env.VITE_APP_API_URL + 'user/' + id, "GET")
        .then((userData) => userData);