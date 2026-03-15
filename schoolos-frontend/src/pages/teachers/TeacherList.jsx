import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { teachersApi } from '../../api/teachers'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

export default function TeacherList() {
  const { t } = useTranslation('teachers')
  const { t: tc } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search, page],
    queryFn: () => teachersApi.list({ search, page, size: 20 }),
  })

  const columns = [
    { key: 'name', header: 'Name', render: (v, row) => v || `${row.firstName || row.first_name || ''} ${row.lastName || row.last_name || ''}`.trim() },
    { key: 'email', header: 'Email' },
    { key: 'subject', header: 'Subject', render: (v) => v || '—' },
    {
      key: 'salary',
      header: 'Salary',
      render: (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—',
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
        <Link to={`/teachers/${id}`} className="text-primary-600 hover:underline text-sm">
          View
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <Link to="/teachers/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Link>
      </div>
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="input-field pl-9"
        />
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
