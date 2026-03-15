import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { feesApi } from '../../api/fees'
import Table from '../../components/common/Table'
import { Link } from 'react-router-dom'

export default function DefaulterList() {
  const { t: tc } = useTranslation('common')

  const { data, isLoading } = useQuery({
    queryKey: ['defaulters'],
    queryFn: () => feesApi.getDefaulterList(),
  })

  const defaulters = Array.isArray(data) ? data : data?.data || []
  const totalDue = defaulters.reduce((s, d) => s + Number(d.dueAmount || d.due_amount || 0), 0)

  const columns = [
    {
      key: 'studentName',
      header: 'Student Name',
      render: (v, row) => (
        <Link to={`/students/${row.studentId || row.student_id}`} className="text-primary-600 hover:underline">
          {v || row.student_name || '—'}
        </Link>
      ),
    },
    {
      key: 'grNumber',
      header: 'GR Number',
      render: (v, row) => v || row.gr_number || '—',
    },
    {
      key: 'className',
      header: 'Class',
      render: (v, row) => {
        const cls = v || row.class_name || '—'
        const sec = row.sectionName || row.section_name
        return sec ? `${cls} - ${sec}` : cls
      },
    },
    {
      key: 'dueAmount',
      header: 'Due Amount',
      render: (v, row) => (
        <span className="font-medium text-red-700">
          ₹{Number(v || row.due_amount || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'lastPaymentDate',
      header: 'Last Payment',
      render: (v, row) => (v || row.last_payment_date)?.split('T')[0] || 'Never',
    },
    {
      key: 'studentId',
      header: '',
      render: (id, row) => (
        <Link
          to={`/fees/ledger?studentId=${id || row.student_id}`}
          className="text-primary-600 hover:underline text-sm"
        >
          View Ledger
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters</h1>
          {defaulters.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {defaulters.length} students with pending dues · Total: ₹{totalDue.toLocaleString('en-IN')}
            </p>
          )}
        </div>
        <button onClick={() => window.print()} className="btn-secondary">
          <Printer className="h-4 w-4" />
          Print List
        </button>
      </div>

      <Table
        columns={columns}
        data={defaulters}
        loading={isLoading}
      />
    </div>
  )
}
