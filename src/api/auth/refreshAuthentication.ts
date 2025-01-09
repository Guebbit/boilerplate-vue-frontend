import axios from '@/utils/axios.ts'

export interface IRefreshAuthenticationResponse {
  secret: string
}

/**
 * Authentication DEMO
 * TODO
 */
export const refreshAuthentication = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  axios.get<IRefreshAuthenticationResponse>('users/1')
    .then((test => {
        console.log("AUTHENTICATION", test)
      // Some code
      return test
    }))

export default refreshAuthentication