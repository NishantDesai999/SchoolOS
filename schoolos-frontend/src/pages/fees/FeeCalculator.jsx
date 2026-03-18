import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'
import { feesApi } from '../../api/fees'
import { schoolApi } from '../../api/school'

const GRADE_OPTIONS = [
  { label: 'KG / Nursery', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `Grade ${i + 1}`, value: i + 1 })),
]

// Generate school-year months Jun YYYY – May YYYY+1
function getSchoolYearMonths(schoolYear) {
  const months = []
  for (let m = 6; m <= 12; m++) {
    months.push(`${schoolYear}-${String(m).padStart(2, '0')}`)
  }
  for (let m = 1; m <= 5; m++) {
    months.push(`${schoolYear + 1}-${String(m).padStart(2, '0')}`)
  }
  return months
}

function currentSchoolYear() {
  const now = new Date()
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1
}

function formatMonth(ym) {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString('en', { month: 'short', year: 'numeric' })
}

// ── Per-student mode ──────────────────────────────────────────────────────────

function StudentFeeCalculator({ studentId, studentName, grNumber, onCollected }) {
  const { t } = useTranslation('fees')
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()

  const schoolYear = currentSchoolYear()
  const monthOptions = getSchoolYearMonths(schoolYear)

  const [fromMonth, setFromMonth] = useState(monthOptions[0])
  const [toMonth, setToMonth] = useState(monthOptions[5])   // default Jun-Nov (H1)
  const [showCollect, setShowCollect] = useState(false)
  const [payMode, setPayMode] = useState('CASH')
  const [upiTxnId, setUpiTxnId] = useState('')
  const [upiSender, setUpiSender] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptShown, setReceiptShown] = useState(null)

  const { data: calc, isLoading, error } = useQuery({
    queryKey: ['fee-calc-student', studentId, fromMonth, toMonth],
    queryFn: () => feesApi.calculateForStudent(studentId, fromMonth, toMonth),
    enabled: !!studentId && !!fromMonth && !!toMonth,
    retry: false,
  })

  const collectMutation = useMutation({
    mutationFn: () => feesApi.collectForStudent({
      studentId,
      fromMonth,
      toMonth,
      items: calc?.items
        ?.filter(it => !it.alreadyPaid)
        .map(it => ({
          breakdownItemId: it.breakdownItemId,
          typeLabel: it.type,
          amount: it.lineTotal,
        })),
      amount: calc?.dueAmount,
      paymentMode: payMode,
      upiTransactionId: payMode === 'UPI' ? upiTxnId : null,
      upiSenderName: payMode === 'UPI' ? upiSender : null,
      notes: notes || null,
    }),
    onSuccess: (result) => {
      setReceiptShown(result.receiptNumber)
      setShowCollect(false)
      queryClient.invalidateQueries({ queryKey: ['fee-calc-student', studentId] })
      queryClient.invalidateQueries({ queryKey: ['student-ledger', studentId] })
      if (onCollected) onCollected()
      toast.success(t('collect_success', { receipt: result.receiptNumber }))
    },
    onError: (err) => toast.error(err.message),
  })

  const toMonthOptions = monthOptions.filter(m => m >= fromMonth)

  return (
    <div className="space-y-4">
      {/* Student info banner (only if we have the info externally) */}
      {studentName && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
          <p className="font-medium text-blue-900">{studentName}</p>
          <p className="text-blue-600">GR: {grNumber}</p>
        </div>
      )}

      {/* Month range selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-36">
          <label className="label">{t('from_month')}</label>
          <select
            value={fromMonth}
            onChange={(e) => { setFromMonth(e.target.value); if (e.target.value > toMonth) setToMonth(e.target.value) }}
            className="input-field"
          >
            {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-36">
          <label className="label">{t('to_month')}</label>
          <select
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className="input-field"
          >
            {toMonthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">{tc('loading')}</p>}
      {error && <p className="text-sm text-red-600">{t('no_fee_config')}</p>}

      {/* Fee breakdown */}
      {calc && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900">{t('fee_breakdown')}</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-500">Type</th>
                <th className="py-2 text-right font-medium text-gray-500">Amount (₹)</th>
                <th className="py-2 text-center font-medium text-gray-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calc.items?.map((item, i) => (
                <tr key={i} className={item.alreadyPaid ? 'opacity-50' : ''}>
                  <td className="py-2 text-gray-700">{item.label || item.type}</td>
                  <td className="py-2 text-right text-gray-900">
                    {item.alreadyPaid ? (
                      <span className="line-through text-gray-400">₹{Number(item.unitAmount).toLocaleString('en-IN')}</span>
                    ) : (
                      <>
                        ₹{Number(item.unitAmount).toLocaleString('en-IN')}
                        {item.multiplier > 1 && (
                          <span className="text-xs text-gray-400 ml-1">× {item.multiplier} = ₹{Number(item.lineTotal).toLocaleString('en-IN')}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    {item.alreadyPaid && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium">
                        <CheckCircle className="h-3 w-3" /> {t('already_paid')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-2 text-gray-900">{t('due_amount')}</td>
                <td className="py-2 text-right text-primary-700 text-base">
                  ₹{Number(calc.dueAmount || 0).toLocaleString('en-IN')}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>

          {receiptShown && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              ✓ {t('collect_success', { receipt: receiptShown })}
            </div>
          )}

          {Number(calc.dueAmount) > 0 && !showCollect && (
            <button onClick={() => setShowCollect(true)} className="btn-primary w-full">
              {t('collect_now')}
            </button>
          )}

          {showCollect && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h4 className="font-medium text-gray-900">{t('collect_fee')}</h4>
              <div>
                <label className="label">{t('payment_mode')}</label>
                <select value={payMode} onChange={e => setPayMode(e.target.value)} className="input-field">
                  <option value="CASH">{t('cash')}</option>
                  <option value="UPI">{t('upi')}</option>
                </select>
              </div>
              {payMode === 'UPI' && (
                <>
                  <div>
                    <label className="label">{t('upi_transaction_id')}</label>
                    <input value={upiTxnId} onChange={e => setUpiTxnId(e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="label">{t('upi_sender_name')}</label>
                    <input value={upiSender} onChange={e => setUpiSender(e.target.value)} className="input-field" />
                  </div>
                </>
              )}
              <div>
                <label className="label">{t('notes')}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => collectMutation.mutate()}
                  disabled={collectMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {collectMutation.isPending ? tc('loading') : `${t('collect_now')} ₹${Number(calc.dueAmount).toLocaleString('en-IN')}`}
                </button>
                <button onClick={() => setShowCollect(false)} className="btn-secondary">
                  {tc('buttons.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Standalone grade-mode (existing behavior) ─────────────────────────────────

export default function FeeCalculator() {
  const { t } = useTranslation('fees')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('studentId')

  // Per-student mode
  if (studentId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('collect_fee')}</h1>
        <StudentFeeCalculator studentId={studentId} />
      </div>
    )
  }

  // Grade mode (standalone)
  return <StandaloneCalculator />
}

function StandaloneCalculator() {
  const { t } = useTranslation('fees')
  const { t: tc } = useTranslation('common')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [monthsInput, setMonthsInput] = useState('1')
  const months = Math.max(1, Math.min(12, Number(monthsInput) || 1))

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['fee-calc-grade', selectedYear, selectedGrade, months],
    queryFn: () => feesApi.calculateByGrade(selectedYear, selectedGrade, months),
    enabled: !!selectedYear && selectedGrade !== '',
    retry: false,
  })

  const yearList = Array.isArray(years) ? years : years?.data || []
  const items = result?.breakdown || []
  const monthlyTotal = items.reduce((s, it) => s + Number(it.value || 0), 0)
  const grandTotal = monthlyTotal * months

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('fee_calculator')}</h1>

      <div className="card space-y-4">
        <p className="text-sm text-gray-500">Select year, grade and number of months to estimate fees.</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-40">
            <label className="label">{t('calendar_year')}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field"
            >
              <option value="">-- Select Year --</option>
              {yearList.map((yr) => (
                <option key={yr.id} value={yr.year}>{yr.label || yr.year}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="label">{t('grade_level')}</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="input-field"
            >
              <option value="">-- Select Grade --</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="label">Months</label>
            <input
              type="number"
              min={1}
              max={12}
              value={monthsInput}
              onChange={(e) => setMonthsInput(e.target.value)}
              onBlur={(e) => setMonthsInput(String(Math.max(1, Math.min(12, Number(e.target.value) || 1))))}
              className="input-field"
            />
          </div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">{tc('loading')}</p>}
        {error && <p className="text-sm text-red-600">{t('no_fee_config')}</p>}
      </div>

      {result && items.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-gray-900">
            {t('fee_breakdown')}
            {months > 1 && (
              <span className="ml-2 text-sm font-normal text-gray-500">× {months} months</span>
            )}
          </h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-500">{t('fee_type')}</th>
                <th className="py-2 text-right font-medium text-gray-500">Per Month (₹)</th>
                {months > 1 && (
                  <th className="py-2 text-right font-medium text-gray-500">{months} Months (₹)</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-700">{item.type}</td>
                  <td className="py-2 text-right text-gray-900">
                    ₹{Number(item.value).toLocaleString('en-IN')}
                  </td>
                  {months > 1 && (
                    <td className="py-2 text-right font-medium text-gray-900">
                      ₹{(Number(item.value) * months).toLocaleString('en-IN')}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-2 text-gray-900">Total</td>
                <td className="py-2 text-right text-gray-900">
                  ₹{monthlyTotal.toLocaleString('en-IN')}
                </td>
                {months > 1 && (
                  <td className="py-2 text-right text-primary-700 text-base">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export { StudentFeeCalculator }
