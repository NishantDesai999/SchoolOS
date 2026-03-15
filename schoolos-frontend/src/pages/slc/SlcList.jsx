import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { slcApi } from '../../api/slc'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

const STATUSES = ['', 'DRAFT', 'ISSUED', 'CANCELLED']

export default function SlcList() {
  const { t: tc } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['slc', search, status, page],
    queryFn: () => slcApi.list({ search, status: status || undefined, page, size: 20 }),
  })

  const columns = [
    {
      key: 'studentName',
      header: 'Student Name',
      render: (v, row) => v || row.student_name || '—',
    },
    {
      key: 'grNumber',
      header: 'GR Number',
      render: (v, row) => v || row.gr_number || '—',
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      render: (v, row) => (v || row.issue_date)?.split('T')[0] || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    {
      key: 'id',
      header: '',
      render: (id) => (
        <Link to={`/slc/${id}`} className="text-primary-600 hover:underline text-sm">
          View
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">School Leaving Certificates</h1>
        <div className="flex gap-2">
          <Link to="/slc/lookup" className="btn-secondary">
            Lookup Student
          </Link>
          <Link to="/slc/issue" className="btn-primary">
            <Plus className="h-4 w-4" />
            Issue SLC
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or GR number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0) }}
          className="input-field w-40"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
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
