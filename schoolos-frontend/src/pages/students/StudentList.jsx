import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { UserPlus, Search } from 'lucide-react'
import { studentsApi } from '../../api/students'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

export default function StudentList() {
  const { t } = useTranslation('students')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, page],
    queryFn: () => studentsApi.list({ search, page, size: 20 }),
  })

  const columns = [
    { key: 'grNumber', header: t('gr_number') },
    { key: 'firstName', header: t('first_name') },
    { key: 'lastName', header: t('last_name') },
    { key: 'status', header: t('status'), render: (v) => <StatusBadge status={v} /> },
    {
      key: 'id',
      header: '',
      render: (id) => (
        <Link to={`/students/${id}`} className="text-primary-600 hover:underline text-sm">
          View
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link to="/students/new" className="btn-primary">
          <UserPlus className="h-4 w-4" />
          {t('add_student')}
        </Link>
      </div>
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="input-field pl-9"
        />
      </div>
      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  )
}
