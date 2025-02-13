import axios from '@/utils/http.ts'
import type { IResponseSuccess } from '@/types'
import type { InternalAxiosRequestConfig } from 'axios'

export interface IRefreshTokenApiResponse {
    token: string
}

export interface IRefreshTokenApiConfig extends InternalAxiosRequestConfig {
    _dontRetry: boolean
}

/**
 * Refresh Access Token using Refresh Token
 * Authentication through JWT Cookie
 */
export const refreshTokenApi = () =>
    axios.get<IRefreshTokenApiResponse, IResponseSuccess<IRefreshTokenApiResponse>>('account/refresh', {
        _dontRetry: true
    } as IRefreshTokenApiConfig)