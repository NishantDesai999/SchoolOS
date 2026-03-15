import { useTranslation } from 'react-i18next'

const PDF_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'gu', label: 'ગુજરાતી' },
]

export default function PdfLanguageSelector({ value, onChange, className }) {
  const { t } = useTranslation('common')

  return (
    <div className={className}>
      <label className="label">{t('language.select_pdf_lang')}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field w-36"
      >
        {PDF_LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
