import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { paymentsApi } from '../../api/payments'
import Table from '../../components/common/Table'

export default function PaymentHistory() {
  const { t: tc } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', search, dateFrom, dateTo, page],
    queryFn: () => paymentsApi.list({
      search,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      size: 20,
    }),
  })

  const columns = [
    {
      key: 'studentName',
      header: 'Student',
      render: (v, row) => v || row.student_name || '—',
    },
    {
      key: 'grNumber',
      header: 'GR',
      render: (v, row) => v || row.gr_number || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (v) => <span className="font-medium text-green-700">₹{Number(v || 0).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'paymentDate',
      header: 'Date',
      render: (v, row) => (v || row.payment_date)?.split('T')[0] || '—',
    },
    {
      key: 'paymentMode',
      header: 'Mode',
      render: (v, row) => v || row.payment_mode || '—',
    },
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: (v, row) => v || row.receipt_number || '—',
    },
    {
      key: 'transactionRef',
      header: 'Txn Ref',
      render: (v, row) => v || row.transaction_ref || '—',
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or GR..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
            className="input-field w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
            className="input-field w-40"
          />
        </div>
        {(dateFrom || dateTo || search) && (
          <button
            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(0) }}
            className="btn-secondary text-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      <Table
        columns={columns}
        data={data?.data || (Array.isArray(data) ? data : [])}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  )
}
