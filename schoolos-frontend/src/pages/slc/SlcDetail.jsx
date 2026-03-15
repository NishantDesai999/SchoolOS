import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, XCircle } from 'lucide-react'
import { slcApi } from '../../api/slc'
import StatusBadge from '../../components/common/StatusBadge'
import PdfLanguageSelector from '../../components/common/PdfLanguageSelector'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 sm:w-48">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}

export default function SlcDetail() {
  const { id } = useParams()
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pdfLang, setPdfLang] = useState('en')

  const { data: slc, isLoading } = useQuery({
    queryKey: ['slc', id],
    queryFn: () => slcApi.getById(id),
  })

  const cancelMutation = useMutation({
    mutationFn: () => slcApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slc', id] })
      queryClient.invalidateQueries({ queryKey: ['slc'] })
      toast.success('SLC cancelled')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleDownload = () => {
    const url = slcApi.getPdfUrl(id, pdfLang)
    window.open(url, '_blank')
  }

  if (isLoading) return <div className="card text-center text-sm text-gray-500">{tc('loading')}</div>
  if (!slc) return <div className="card text-center text-sm text-gray-500">SLC not found</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/slc')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">School Leaving Certificate</h1>
          <p className="text-sm text-gray-500">SLC #{slc.id}</p>
        </div>
        <StatusBadge status={slc.status?.toLowerCase()} />
      </div>

      {/* SLC Details */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-gray-900">Student Details</h2>
        <InfoRow label="Student Name" value={slc.studentName || slc.student?.name || `${slc.student?.firstName || ''} ${slc.student?.lastName || ''}`.trim()} />
        <InfoRow label="GR Number" value={slc.grNumber || slc.gr_number || slc.student?.grNumber} />
        <InfoRow label="Last Class" value={slc.lastClass || slc.last_class} />
        <InfoRow label="Last Section" value={slc.lastSection || slc.last_section} />
        <InfoRow label="Leaving Date" value={(slc.leavingDate || slc.leaving_date)?.split('T')[0]} />
        <InfoRow label="Reason" value={slc.reason} />
        <InfoRow label="Conduct" value={slc.conduct} />
        <InfoRow label="Remark" value={slc.remark} />
        <InfoRow label="Issue Date" value={(slc.issueDate || slc.issue_date)?.split('T')[0]} />
      </div>

      {/* Signature */}
      {(slc.signatureUrl || slc.signature_url || slc.signature) && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-gray-900">Principal Signature</h2>
          <img
            src={slc.signatureUrl || slc.signature_url || slc.signature}
            alt="Principal Signature"
            className="max-h-24 rounded border border-gray-200"
          />
        </div>
      )}

      {/* Actions */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <PdfLanguageSelector value={pdfLang} onChange={setPdfLang} />
          <button onClick={handleDownload} className="btn-primary">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>

        {slc.status !== 'CANCELLED' && (
          <div className="border-t pt-4">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this SLC?')) {
                  cancelMutation.mutate()
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
            >
              <XCircle className="h-4 w-4" />
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel SLC'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
