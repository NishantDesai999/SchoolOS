import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Receipt, X } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { paymentsApi } from '../../api/payments'

const schema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  paymentMode: z.enum(['CASH', 'UPI', 'CHEQUE', 'NEFT']),
  upiTransactionId: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date required'),
  notes: z.string().optional(),
})

export default function PaymentForm() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [student, setStudent] = useState(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)
  const [receipt, setReceipt] = useState(null)

  // Search students by name / GR number
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['student-search-pay', activeSearch],
    queryFn: () => studentsApi.list({ search: activeSearch, size: 8 }),
    enabled: activeSearch.length >= 2,
  })

  // Load pending invoices when student selected
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['student-invoices', student?.id],
    queryFn: () => studentsApi.getInvoices(student.id),
    enabled: !!student?.id,
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
    },
  })

  // Invoice-based payment
  const invoiceMutation = useMutation({
    mutationFn: (data) => paymentsApi.record({ ...data, invoiceId: selectedInvoiceId }),
    onSuccess: (result) => { toast.success('Payment recorded'); setReceipt(result) },
    onError: (err) => toast.error(err.message),
  })

  // Direct payment (no invoice)
  const directMutation = useMutation({
    mutationFn: (data) => paymentsApi.directCollect({ ...data, studentId: student.id }),
    onSuccess: (result) => { toast.success('Payment recorded'); setReceipt(result) },
    onError: (err) => toast.error(err.message),
  })

  const handleSearch = () => {
    if (searchQuery.trim().length >= 2) setActiveSearch(searchQuery.trim())
  }

  const handleSelectStudent = (s) => {
    setStudent(s)
    setActiveSearch('')
    setSearchQuery('')
    setSelectedInvoiceId(null)
  }

  const handleClearStudent = () => {
    setStudent(null)
    setSelectedInvoiceId(null)
  }

  const pendingInvoices = (Array.isArray(invoicesData) ? invoicesData : invoicesData?.data || [])
    .filter((inv) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(inv.status))

  const handleSelectInvoice = (inv) => {
    setSelectedInvoiceId(inv.id)
    setValue('amount', Number(inv.netAmount || inv.balance || 0))
  }

  const onSubmit = (data) => {
    if (!student) return toast.error('Select a student first')
    if (selectedInvoiceId) {
      invoiceMutation.mutate(data)
    } else {
      directMutation.mutate(data)
    }
  }

  const students = Array.isArray(searchResults) ? searchResults : searchResults?.data || []
  const isPending = invoiceMutation.isPending || directMutation.isPending

  // ── Receipt screen ────────────────────────────────────────
  if (receipt) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="card text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Recorded!</h2>
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Receipt #</span>
              <span className="font-medium">{receipt.receiptNumber || receipt.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-green-700">
                ₹{Number(receipt.amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium">{receipt.paymentMode}</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setReceipt(null); setStudent(null) }}
              className="btn-secondary"
            >
              New Payment
            </button>
            <button onClick={() => navigate('/payments')} className="btn-primary">
              View History
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Record Fee Payment</h1>

      {/* Student Search */}
      <div className="card space-y-3">
        <label className="label">Search Student (name or GR number)</label>

        {!student ? (
          <>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type name or GR number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="input-field pl-9"
                />
              </div>
              <button onClick={handleSearch} disabled={searching} className="btn-secondary">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {students.length > 0 && (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {s.firstName || s.first_name} {s.lastName || s.last_name}
                      </p>
                      <p className="text-xs text-gray-500">GR: {s.grNumber || s.gr_number}</p>
                    </div>
                    <span className="text-xs text-primary-600 font-medium">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {activeSearch.length >= 2 && students.length === 0 && !searching && (
              <p className="text-sm text-gray-500">No students found for "{activeSearch}"</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
            <div>
              <p className="font-medium text-green-900">
                {student.firstName || student.first_name} {student.lastName || student.last_name}
              </p>
              <p className="text-sm text-green-700">GR: {student.grNumber || student.gr_number}</p>
            </div>
            <button onClick={handleClearStudent} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Pending invoice selection (only shown when invoices exist) */}
      {student && !invoicesLoading && pendingInvoices.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">
            Pending Invoices <span className="text-sm font-normal text-gray-500">(optional — select to pre-fill amount)</span>
          </h2>
          <div className="space-y-2">
            {pendingInvoices.map((inv) => (
              <label
                key={inv.id}
                className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
                  selectedInvoiceId === inv.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="invoice"
                  checked={selectedInvoiceId === inv.id}
                  onChange={() => handleSelectInvoice(inv)}
                  className="h-4 w-4 text-primary-600"
                />
                <div className="flex-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    {inv.periodLabel || inv.period} — {inv.status}
                  </span>
                  <span className="font-medium text-red-700">
                    ₹{Number(inv.netAmount || inv.balance || 0).toLocaleString('en-IN')} due
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Payment form — always shown once student is selected */}
      {student && (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Payment Details</h2>

          {!selectedInvoiceId && !invoicesLoading && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {pendingInvoices.length > 0
                ? 'No invoice selected — will record as direct payment.'
                : 'No pending invoices — recording as direct fee collection.'}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" {...register('amount')} className="input-field" />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Payment Mode *</label>
              <select {...register('paymentMode')} className="input-field">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="NEFT">NEFT</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Payment Date *</label>
              <input type="date" {...register('paymentDate')} className="input-field" />
              {errors.paymentDate && (
                <p className="mt-1 text-xs text-red-600">{errors.paymentDate.message}</p>
              )}
            </div>
            {watch('paymentMode') === 'UPI' && (
              <div className="sm:col-span-2">
                <label className="label">UPI Transaction ID</label>
                <input {...register('upiTransactionId')} className="input-field" placeholder="Optional" />
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClearStudent} className="btn-secondary">
              {tc('buttons.cancel')}
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
