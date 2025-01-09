import en from '@/locales/en.json'

/**
 * Demo of new locale loading from a server
 */
export const getLanguage = () =>
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  new Promise(resolve => setTimeout(() => resolve(en), 1000))

export default getLanguage