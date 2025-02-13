import axios from '@/utils/http.ts'
import { ERefreshTokenExpiryTime, type IResponseSuccess, type IUserForm } from '@/types'

export interface ILoginApiParameters extends Pick<IUserForm, 'email' | 'password'> {
    rememeber: ERefreshTokenExpiryTime
}

export interface ILoginApiResponse {
    token: string
}

/**
 * Login user through email and password
 */
export const loginApi = (email: string, password: string, remember = ERefreshTokenExpiryTime.MEDIUM) =>
    axios.post<ILoginApiResponse, IResponseSuccess<ILoginApiResponse>, ILoginApiParameters>('account/login', {
        email,
        password,
        remember
    })