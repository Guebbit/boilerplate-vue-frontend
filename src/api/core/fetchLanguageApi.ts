import en from '@/locales/en.json'
import it from '@/locales/it.json'
import type { ITranslationDictionaries } from '@/plugins/i18n.ts'

const languagesFakeDownload: Record<string, ITranslationDictionaries> = {
    en,
    it,
    es: {}
};

/**
 * Demo of new locale loading from a server
 */
export const fetchLanguageApi = (locale: string):Promise<[string, ITranslationDictionaries]> =>
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
  new Promise(resolve => setTimeout(() => resolve([locale, languagesFakeDownload[locale]]), 1000))