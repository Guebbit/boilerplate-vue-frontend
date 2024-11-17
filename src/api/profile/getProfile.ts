import axios from "@/utils/http";
import type { IUserProfile } from '@/types'

/**
 * Get Profile data DEMO
 */
export default () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axios.get<any, IUserProfile>((import.meta.env.VITE_APP_API_URL || "") + 'users/1', {
        headers: {
            'Accept': 'application/json',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/json',
        },
    })
        .then(({ id, username, email }) => {
            // Some code
            return {
                id,
                username,
                email
            };
        });
