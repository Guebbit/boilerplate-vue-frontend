import axios from '@/utils/http.ts'
import type { AxiosProgressEvent } from 'axios'
import type { IProductIdentification } from '@/types'

/**
 * Put Profile data DEMO
 *
 * @param id
 * @param formData
 * @param onUploadProgress
 */
export const updateProductImageApi = (
    id: IProductIdentification,
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
) =>
    axios.put('https://httpbin.org/put', formData,{
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress
    })