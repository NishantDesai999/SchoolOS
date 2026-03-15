import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('schoolos-lang') || 'en',
    fallbackLng: 'en',
    ns: [
      'common',
      'students',
      'teachers',
      'fees',
      'payments',
      'slc',
      'govtocr',
      'digest',
      'dashboard',
    ],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
