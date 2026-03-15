import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, Plus } from 'lucide-react'
import { govtOcrApi } from '../../api/govtocr'
import StatusBadge from '../../components/common/StatusBadge'

export default function OcrResult() {
  const { id } = useParams()
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const { data: circular, isLoading } = useQuery({
    queryKey: ['govt-circular', id],
    queryFn: () => govtOcrApi.getById(id),
  })

  if (isLoading) return <div className="card text-center text-sm text-gray-500">{tc('loading')}</div>
  if (!circular) return <div className="card text-center text-sm text-gray-500">Circular not found</div>

  const ocrText = circular.extractedText || circular.extracted_text || circular.ocrText || circular.ocr_text || ''
  const fileUrl = circular.fileUrl || circular.file_url || circular.imageUrl || circular.image_url
  const isImage = fileUrl && (fileUrl.endsWith('.png') || fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg'))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {circular.title || circular.filename || `Circular #${circular.id}`}
          </h1>
          <p className="text-sm text-gray-500">
            Uploaded: {(circular.createdAt || circular.created_at)?.split('T')[0] || '—'}
          </p>
        </div>
        <StatusBadge status={circular.status?.toLowerCase()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* File Preview */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Uploaded File</h2>
          {fileUrl ? (
            isImage ? (
              <img
                src={fileUrl}
                alt="Circular"
                className="w-full rounded-lg border border-gray-200 object-contain max-h-96"
              />
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <FileText className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">View PDF</p>
                  <p className="text-xs text-gray-500">Click to open in new tab</p>
                </div>
              </a>
            )
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
              No file preview available
            </div>
          )}
        </div>

        {/* Extracted Text */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Extracted Text</h2>
          {ocrText ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono leading-relaxed">
              {ocrText}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">
                {circular.status === 'PROCESSING' ? 'OCR processing in progress...' : 'No text extracted yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/govtocr/upload" className="btn-primary">
          <Plus className="h-4 w-4" /> Upload Another
        </Link>
        <Link to="/govtocr" className="btn-secondary">
          View All Circulars
        </Link>
      </div>
    </div>
  )
}
