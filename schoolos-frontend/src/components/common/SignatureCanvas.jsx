import { useRef } from 'react'
import ReactSignatureCanvas from 'react-signature-canvas'
import { useTranslation } from 'react-i18next'

/**
 * Drawable signature canvas that returns a PNG data URL.
 *
 * @param {Function} onSave - Called with base64 PNG data URL
 * @param {string} label - Display label
 */
export default function SignatureCanvas({ onSave, label }) {
  const sigRef = useRef(null)
  const { t } = useTranslation('common')

  const handleSave = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    const dataUrl = sigRef.current.toDataURL('image/png')
    onSave(dataUrl)
  }

  const handleClear = () => {
    sigRef.current?.clear()
  }

  return (
    <div className="space-y-2">
      {label && <label className="label">{label}</label>}
      <div className="rounded-md border border-gray-300 bg-white overflow-hidden">
        <ReactSignatureCanvas
          ref={sigRef}
          canvasProps={{
            width: 400,
            height: 150,
            className: 'w-full',
            style: { touchAction: 'none' },
          }}
          backgroundColor="white"
          penColor="black"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleClear} className="btn-secondary text-xs px-3 py-1.5">
          {t('buttons.clear')}
        </button>
        <button type="button" onClick={handleSave} className="btn-primary text-xs px-3 py-1.5">
          {t('buttons.save_signature')}
        </button>
      </div>
    </div>
  )
}
