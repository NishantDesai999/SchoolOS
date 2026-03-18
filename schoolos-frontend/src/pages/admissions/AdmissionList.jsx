import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { admissionsApi } from '../../api/students'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

const STATUSES = ['', 'APPLIED', 'ADMITTED', 'REJECTED', 'ENROLLED']

export default function AdmissionList() {
  const { t } = useTranslation('admissions')
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admissions', search, status, page],
    queryFn: () => admissionsApi.list({ search, status: status || undefined, page, size: 20 }),
  })

  const convertMutation = useMutation({
    mutationFn: (id) => admissionsApi.convert(id, {}),
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      toast.success(t('convert_success'))
      const studentId = student?.id || student?.data?.id
      if (studentId) navigate(`/students/${studentId}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const columns = [
    { key: 'studentName', header: t('columns.applicant_name'), render: (v) => v || '—' },
    { key: 'targetGradeLevel', header: t('columns.grade'), render: (v) => v ? `Grade ${v}` : '—' },
    { key: 'guardianName', header: t('columns.parent_name'), render: (v) => v || '—' },
    { key: 'guardianPhone', header: t('columns.phone'), render: (v) => v || '—' },
    {
      key: 'status',
      header: t('columns.status'),
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    { key: 'createdAt', header: t('columns.date'), render: (v, row) => (v || row.created_at)?.split?.('T')?.[0] || '—' },
    {
      key: 'id',
      header: t('columns.actions'),
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/admissions/${id}`)} className="text-primary-600 hover:underline text-sm">
            {t('columns.view')}
          </button>
          {(row.status === 'APPLIED' || row.status === 'APPROVED') && (
            <button
              onClick={() => convertMutation.mutate(id)}
              disabled={convertMutation.isPending}
              className="text-green-600 hover:underline text-sm"
            >
              {t('columns.convert')}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button onClick={() => navigate('/students/new')} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('enroll_student')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
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
            <option key={s} value={s}>{s || t('all_statuses')}</option>
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
