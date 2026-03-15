import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { feesApi } from '../../api/fees'
import StatusBadge from '../../components/common/StatusBadge'
import Table from '../../components/common/Table'

export default function StudentLedger() {
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
    onSuccess: (data) => {
      if (data?.id) setStudentId(data.id)
    },
  })

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['student-ledger', studentId],
    queryFn: () => feesApi.getStudentInvoices(studentId),
    enabled: !!studentId,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (grInput.trim()) setSearchGr(grInput.trim())
  }

  const invoices = Array.isArray(ledger) ? ledger : ledger?.data || []
  const totalBilled = invoices.reduce((s, inv) => s + Number(inv.totalAmount || inv.total_amount || 0), 0)
  const totalPaid = invoices.reduce((s, inv) => s + Number(inv.amountPaid || inv.amount_paid || 0), 0)
  const totalBalance = invoices.reduce((s, inv) => s + Number(inv.balance || 0), 0)

  const columns = [
    { key: 'period', header: 'Period', render: (v, row) => v || row.yearLabel || row.year_label || '—' },
    {
      key: 'totalAmount',
      header: 'Total Billed',
      render: (v, row) => `₹${Number(v || row.total_amount || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      render: (v, row) => `₹${Number(v || row.amount_paid || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (v) => (
        <span className={Number(v) > 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
          ₹{Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (v, row) => (v || row.due_date)?.split('T')[0] || '—',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Student Ledger</h1>

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
          {/* Summary Cards */}
          {invoices.length > 0 && (
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
            data={invoices}
            loading={ledgerLoading}
          />
        </>
      )}
    </div>
  )
}
