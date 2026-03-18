import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { feesApi } from '../../api/fees'
import StatusBadge from '../../components/common/StatusBadge'
import Table from '../../components/common/Table'

export default function StudentLedger() {
  const { t } = useTranslation('fees')
  const { t: tc } = useTranslation('common')
  const [searchParams] = useSearchParams()
  const [grInput, setGrInput] = useState('')
  const [searchGr, setSearchGr] = useState('')
  const [studentId, setStudentId] = useState(searchParams.get('studentId') || '')

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-lookup-gr', searchGr],
    queryFn: () => studentsApi.lookupByGr(searchGr),
    enabled: !!searchGr,
    retry: false,
  })

  useEffect(() => {
    if (student?.id) setStudentId(student.id)
  }, [student])

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['student-ledger', studentId],
    queryFn: () => feesApi.getStudentLedger(studentId),
    enabled: !!studentId,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (grInput.trim()) setSearchGr(grInput.trim())
  }

  const entries = Array.isArray(ledger) ? ledger : ledger?.data || []
  const totalBilled  = entries.filter(e => e.type === 'INVOICE').reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalPaid    = entries.reduce((s, e) => s + Number(e.paid || 0), 0)
  const totalBalance = entries.filter(e => e.type === 'INVOICE').reduce((s, e) => s + Number(e.balance || 0), 0)

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (v) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v === 'INVOICE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
          {v === 'INVOICE' ? 'Invoice' : 'Payment'}
        </span>
      ),
    },
    { key: 'reference', header: 'Reference', render: (v) => v || '—' },
    { key: 'period',    header: 'Period', render: (v) => v || '—' },
    {
      key: 'amount',
      header: t('total_amount'),
      render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (v, row) => row.type === 'DIRECT_PAYMENT' ? '—' : (
        <span className={Number(v) > 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
          ₹{Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: tc('status.paid'),
      render: (v) => v ? <StatusBadge status={v?.toLowerCase()} /> : '—',
    },
    {
      key: 'date',
      header: t('due_date'),
      render: (v) => v?.split?.('T')?.[0] || v || '—',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('ledger')}</h1>

      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter GR number..."
              value={grInput}
              onChange={(e) => setGrInput(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button type="submit" className="btn-primary">
            {tc('buttons.search')}
          </button>
        </form>

        {studentLoading && <p className="mt-3 text-sm text-gray-500">{tc('loading')}</p>}

        {(student || studentId) && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
            {student ? (
              <>
                <p className="font-medium text-gray-900">
                  {student.firstName || student.first_name} {student.lastName || student.last_name}
                </p>
                <p className="text-gray-500">GR: {student.grNumber || student.gr_number}</p>
              </>
            ) : (
              <p className="text-gray-500">Student ID: {studentId}</p>
            )}
          </div>
        )}
      </div>

      {studentId && (
        <>
          {entries.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="stat-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-sm font-bold text-white">₹</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Billed</p>
                  <p className="text-xl font-bold text-gray-900">₹{totalBilled.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                  <span className="text-sm font-bold text-white">₹</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold text-green-700">₹{totalPaid.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                  <span className="text-sm font-bold text-white">₹</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className="text-xl font-bold text-red-700">₹{totalBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          <Table
            columns={columns}
            data={entries}
            loading={ledgerLoading}
          />
        </>
      )}
    </div>
  )
}
