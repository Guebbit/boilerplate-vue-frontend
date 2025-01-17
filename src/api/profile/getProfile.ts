import axios from '@/utils/http.ts'
import type { IUserProfile } from '@/types'

/**
 * Get Profile data DEMO TODO
 */
export const getProfile = () =>
    axios.get<IUserProfile>('users/1')
        .then((test) => {
            console.log("GETPROFILE", test)
            // Some code
            return {
                // id,
                // username,
                // email
            }
        });

export default getProfile;