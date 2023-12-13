import { i18n } from "@/plugins/i18n";

/**
 *
 * @param url
 * @param method - GET can't have body
 * @param body
 */
export default async <T>(url: string, method = "GET", body: Record<string, string> = {}) => {
    return fetch(url, {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': i18n.global.locale.value, // Current language
        },
        body: method !== "GET" ? JSON.stringify(body) : undefined,
    })
        .then((response) => {
            if(!response.ok)
                throw response;
            // const { ok, status, statusText} = response;
            // if(!ok)
            //     switch (status){
            //         case 401: throw new Error("Wrong credentials");
            //         case 500: throw new Error("Server error");
            //         default: throw new Error(statusText);
            //     }
            return response.json() as Promise<T>;
        });
}