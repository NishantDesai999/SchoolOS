import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Upload, Search, Check } from 'lucide-react'
import { paymentsApi } from '../../api/payments'
import { studentsApi } from '../../api/students'

const STEPS = ['Upload Screenshot', 'Review Extracted Data', 'Match Student', 'Confirm']

export default function UpiUpload() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [grInput, setGrInput] = useState('')
  const [student, setStudent] = useState(null)

  const ocrMutation = useMutation({
    mutationFn: (formData) => paymentsApi.upiOcr(formData),
    onSuccess: (data) => {
      setExtracted(data)
      setStep(1)
    },
    onError: (err) => toast.error(err.message || 'OCR failed'),
  })

  const lookupMutation = useMutation({
    mutationFn: (gr) => studentsApi.lookupByGr(gr),
    onSuccess: (data) => {
      setStudent(data)
      setStep(2)
    },
    onError: () => toast.error('Student not found'),
  })

  const confirmMutation = useMutation({
    mutationFn: (data) => paymentsApi.record(data),
    onSuccess: () => {
      toast.success('Payment recorded from UPI screenshot')
      navigate('/payments/history')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = () => {
    if (!file) return toast.error('Please select a file first')
    const fd = new FormData()
    fd.append('file', file)
    ocrMutation.mutate(fd)
  }

  const handleLookup = () => {
    if (grInput.trim()) lookupMutation.mutate(grInput.trim())
  }

  const handleConfirm = () => {
    if (!student || !extracted) return
    confirmMutation.mutate({
      student_id: student.id,
      amount: extracted.amount,
      payment_mode: 'UPI',
      transaction_ref: extracted.txnId || extracted.txn_id,
      payment_date: extracted.date || new Date().toISOString().split('T')[0],
      notes: `UPI OCR: ${extracted.senderName || ''}`,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">UPI Payment Upload</h1>

      {/* Steps */}
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i < step ? 'bg-green-600 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className="ml-1 hidden sm:block text-xs text-gray-500">{label}</span>
            {i < STEPS.length - 1 && <div className="mx-2 flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Upload UPI Screenshot</h2>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-10 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
            <p className="text-xs text-gray-400">PNG, JPG supported</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {preview && (
            <div className="flex items-center gap-4">
              <img src={preview} alt="Preview" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file?.name}</p>
                <p className="text-xs text-gray-500">{(file?.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || ocrMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {ocrMutation.isPending ? 'Extracting...' : 'Extract Payment Details'}
          </button>
        </div>
      )}

      {/* Step 1: Review Extracted */}
      {step === 1 && extracted && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Extracted Payment Details</h2>
          <div className="rounded-lg bg-gray-50 p-4 space-y-3 text-sm">
            {[
              ['Transaction ID', extracted.txnId || extracted.txn_id],
              ['Amount', extracted.amount ? `₹${Number(extracted.amount).toLocaleString('en-IN')}` : null],
              ['Date', extracted.date],
              ['Sender', extracted.senderName || extracted.sender_name],
              ['Status', extracted.status],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          {preview && (
            <img src={preview} alt="UPI Screenshot" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(2)} className="btn-primary">Match Student</button>
          </div>
        </div>
      )}

      {/* Step 2: Match Student */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Match to Student</h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter student GR number..."
                value={grInput}
                onChange={(e) => setGrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="input-field pl-9"
              />
            </div>
            <button onClick={handleLookup} disabled={lookupMutation.isPending} className="btn-secondary">
              {lookupMutation.isPending ? 'Searching...' : tc('buttons.search')}
            </button>
          </div>

          {student && (
            <div className="rounded-lg bg-green-50 p-3 text-sm">
              <p className="font-medium text-green-900">
                {student.firstName || student.first_name} {student.lastName || student.last_name}
              </p>
              <p className="text-green-700">GR: {student.grNumber || student.gr_number}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => student && setStep(3)} disabled={!student} className="btn-primary">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && extracted && student && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Confirm Payment</h2>
          <div className="rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Student</span>
              <span className="font-medium">
                {student.firstName || student.first_name} {student.lastName || student.last_name} ({student.grNumber || student.gr_number})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-green-700">₹{Number(extracted.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Txn ID</span>
              <span className="font-medium">{extracted.txnId || extracted.txn_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{extracted.date || '—'}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button onClick={handleConfirm} disabled={confirmMutation.isPending} className="btn-primary">
              {confirmMutation.isPending ? 'Confirming...' : tc('buttons.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
