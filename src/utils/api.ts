import { Configuration, DefaultApi } from '@/api';

export const apiConfig = new Configuration({
    basePath: 'http://localhost:3000',
    accessToken: () => localStorage.getItem('accessToken') || ''
});

export const api = new DefaultApi(apiConfig);
