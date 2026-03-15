import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, CheckSquare, Square, Receipt } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { paymentsApi } from '../../api/payments'

const schema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be positive'),
  payment_mode: z.enum(['CASH', 'ONLINE', 'CHEQUE', 'UPI']),
  transaction_ref: z.string().optional(),
  payment_date: z.string().min(1, 'Payment date required'),
  notes: z.string().optional(),
})

export default function PaymentForm() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [grInput, setGrInput] = useState('')
  const [searchGr, setSearchGr] = useState('')
  const [student, setStudent] = useState(null)
  const [selectedInvoices, setSelectedInvoices] = useState([])
  const [receipt, setReceipt] = useState(null)

  const { isLoading: studentLoading } = useQuery({
    queryKey: ['student-gr', searchGr],
    queryFn: () => studentsApi.lookupByGr(searchGr),
    enabled: !!searchGr,
    retry: false,
    onSuccess: (data) => {
      setStudent(data)
      setSelectedInvoices([])
    },
    onError: () => {
      toast.error('Student not found')
      setStudent(null)
    },
  })

  const { data: invoicesData } = useQuery({
    queryKey: ['student-invoices-pending', student?.id],
    queryFn: () => studentsApi.getInvoices(student.id),
    enabled: !!student?.id,
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'CASH',
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => paymentsApi.record(data),
    onSuccess: (result) => {
      toast.success('Payment recorded successfully')
      setReceipt(result)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleLookup = () => {
    if (grInput.trim()) setSearchGr(grInput.trim())
  }

  const toggleInvoice = (inv) => {
    setSelectedInvoices((prev) => {
      const isSelected = prev.some((i) => i.id === inv.id)
      const next = isSelected ? prev.filter((i) => i.id !== inv.id) : [...prev, inv]
      // auto-fill amount
      const total = next.reduce((s, i) => s + Number(i.balance || 0), 0)
      setValue('amount', total)
      return next
    })
  }

  const onSubmit = (data) => {
    if (!student) return toast.error('Please search for a student first')
    mutation.mutate({
      ...data,
      student_id: student.id,
      invoice_ids: selectedInvoices.map((i) => i.id),
    })
  }

  const pendingInvoices = (Array.isArray(invoicesData) ? invoicesData : invoicesData?.data || [])
    .filter((inv) => inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE')

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
              <span className="font-medium">{receipt.receiptNumber || receipt.receipt_number || receipt.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-green-700">₹{Number(receipt.amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium">{receipt.paymentMode || receipt.payment_mode}</span>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => { setReceipt(null); setStudent(null); setGrInput(''); setSearchGr('') }} className="btn-secondary">
              New Payment
            </button>
            <button onClick={() => navigate('/payments/history')} className="btn-primary">
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
        <label className="label">Search Student by GR Number</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter GR number..."
              value={grInput}
              onChange={(e) => setGrInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="input-field pl-9"
            />
          </div>
          <button onClick={handleLookup} disabled={studentLoading} className="btn-secondary">
            {studentLoading ? 'Searching...' : tc('buttons.search')}
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
      </div>

      {/* Pending Invoices */}
      {student && pendingInvoices.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Pending Invoices</h2>
          <p className="text-xs text-gray-500">Select invoices to pay</p>
          <div className="space-y-2">
            {pendingInvoices.map((inv) => {
              const selected = selectedInvoices.some((i) => i.id === inv.id)
              return (
                <label key={inv.id} className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleInvoice(inv)}
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <div className="flex-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{inv.period || inv.yearLabel || inv.year_label}</span>
                    <span className="font-medium text-red-700">
                      ₹{Number(inv.balance || 0).toLocaleString('en-IN')} due
                    </span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment Form */}
      {student && (
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Payment Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" {...register('amount')} className="input-field" />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Payment Mode *</label>
              <select {...register('payment_mode')} className="input-field">
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Payment Date *</label>
              <input type="date" {...register('payment_date')} className="input-field" />
              {errors.payment_date && <p className="mt-1 text-xs text-red-600">{errors.payment_date.message}</p>}
            </div>
            <div>
              <label className="label">Transaction Reference</label>
              <input {...register('transaction_ref')} className="input-field" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setStudent(null); setGrInput(''); setSearchGr('') }} className="btn-secondary">
              {tc('buttons.cancel')}
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
