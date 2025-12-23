import axios from '@/utils/http.ts';
import type { AxiosProgressEvent, AxiosResponse } from 'axios';
import type { IUser, IUserIdentification } from '@/types';

/**
 * Put Profile data DEMO
 *
 * @param id
 * @param formData
 * @param onUploadProgress
 */
export const updateUserImageApi = (
    id: IUserIdentification, // TODO
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<AxiosResponse<IUser>> =>
    axios.put<IUser>('https://httpbin.org/put', formData, {
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress
    });
