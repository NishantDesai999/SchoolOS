import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { admissionsApi } from '../../api/students'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

const STATUSES = ['', 'INQUIRY', 'APPLIED', 'ADMITTED', 'REJECTED']

export default function AdmissionList() {
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
      toast.success('Converted to student successfully')
      const studentId = student?.id || student?.data?.id
      if (studentId) navigate(`/students/${studentId}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const columns = [
    { key: 'applicantName', header: 'Applicant Name', render: (v, row) => v || row.applicant_name || '—' },
    { key: 'gradeApplying', header: 'Grade', render: (v, row) => v || row.grade_applying || '—' },
    { key: 'parentName', header: 'Parent Name', render: (v, row) => v || row.parent_name || '—' },
    { key: 'parentPhone', header: 'Phone', render: (v, row) => v || row.parent_phone || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    { key: 'createdAt', header: 'Date', render: (v, row) => (v || row.created_at)?.split?.('T')?.[0] || '—' },
    {
      key: 'id',
      header: 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link to={`/admissions/${id}`} className="text-primary-600 hover:underline text-sm">
            View
          </Link>
          {(row.status === 'APPLIED' || row.status === 'APPROVED') && (
            <button
              onClick={() => convertMutation.mutate(id)}
              disabled={convertMutation.isPending}
              className="text-green-600 hover:underline text-sm"
            >
              Convert
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
        <Link to="/admissions/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          New Inquiry
        </Link>
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
