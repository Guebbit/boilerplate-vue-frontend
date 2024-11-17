import axios from '@/utils/http'
import { i18n } from '@/plugins/i18n'
import type { AxiosProgressEvent } from 'axios'

/**
 * Put Profile data DEMO
 *
 * @param formData
 * @param onUploadProgress
 */
export default (formData: FormData, onUploadProgress: (progressEvent: AxiosProgressEvent) => void) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    axios.put<any, any>('https://httpbin.org/put', formData,{
        headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress
    })
