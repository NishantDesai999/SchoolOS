import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit, IndianRupee, ToggleLeft, ToggleRight } from 'lucide-react'
import { teachersApi } from '../../api/teachers'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  subject: z.string().optional(),
  phone: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
})

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 sm:w-40">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}

export default function TeacherDetail() {
  const { id } = useParams()
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teachersApi.getById(id),
  })

  const { data: salaryHistory } = useQuery({
    queryKey: ['teacher-salary', id],
    queryFn: () => teachersApi.getSalaryHistory(id),
    enabled: !!id,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(editSchema),
    values: teacher ? {
      name: teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
      email: teacher.email || '',
      subject: teacher.subject || '',
      phone: teacher.phone || '',
      salary: teacher.salary || 0,
    } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data) => teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', id] })
      toast.success('Teacher updated')
      setEditMode(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: () => teachersApi.update(id, { status: teacher?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', id] })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) return <div className="card text-center text-sm text-gray-500">{tc('loading')}</div>
  if (!teacher) return <div className="card text-center text-sm text-gray-500">Teacher not found</div>

  const salaryList = Array.isArray(salaryHistory) ? salaryHistory : salaryHistory?.data || []

  const salaryColumns = [
    { key: 'month', header: 'Month', render: (v, row) => `${row.month || v}/${row.year || ''}` },
    { key: 'baseSalary', header: 'Base', render: (v, row) => `₹${Number(v || row.base_salary || 0).toLocaleString('en-IN')}` },
    { key: 'deductions', header: 'Deductions', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { key: 'netPaid', header: 'Net Paid', render: (v, row) => `₹${Number(v || row.net_paid || 0).toLocaleString('en-IN')}` },
    { key: 'paymentDate', header: 'Date', render: (v, row) => (v || row.payment_date)?.split('T')[0] || '—' },
    { key: 'paymentMode', header: 'Mode', render: (v, row) => v || row.payment_mode || '—' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/teachers')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {teacher.name || `${teacher.firstName || teacher.first_name || ''} ${teacher.lastName || teacher.last_name || ''}`.trim()}
          </h1>
          <p className="text-sm text-gray-500">{teacher.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={teacher.status?.toLowerCase()} />
          <button
            onClick={() => toggleStatusMutation.mutate()}
            disabled={toggleStatusMutation.isPending}
            className="btn-secondary flex items-center gap-1"
          >
            {teacher.status === 'ACTIVE'
              ? <ToggleRight className="h-4 w-4 text-green-600" />
              : <ToggleLeft className="h-4 w-4 text-gray-400" />
            }
            {teacher.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => setEditMode(!editMode)} className="btn-secondary">
            <Edit className="h-4 w-4" /> {editMode ? 'Cancel Edit' : tc('buttons.edit')}
          </button>
          <Link to={`/teachers/${id}/salary`} className="btn-primary">
            <IndianRupee className="h-4 w-4" /> Record Salary
          </Link>
        </div>
      </div>

      {/* Info / Edit Form */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-gray-900">Teacher Information</h2>
        {editMode ? (
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name *</label>
                <input {...register('name')} className="input-field" />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" {...register('email')} className="input-field" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Subject</label>
                <input {...register('subject')} className="input-field" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register('phone')} className="input-field" />
              </div>
              <div>
                <label className="label">Base Salary (₹)</label>
                <input type="number" {...register('salary')} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending ? 'Saving...' : tc('buttons.save')}
              </button>
              <button type="button" onClick={() => { setEditMode(false); reset() }} className="btn-secondary">
                {tc('buttons.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <InfoRow label="Name" value={teacher.name || `${teacher.firstName || teacher.first_name || ''} ${teacher.lastName || teacher.last_name || ''}`.trim()} />
            <InfoRow label="Email" value={teacher.email} />
            <InfoRow label="Subject" value={teacher.subject} />
            <InfoRow label="Phone" value={teacher.phone} />
            <InfoRow label="Base Salary" value={teacher.salary ? `₹${Number(teacher.salary).toLocaleString('en-IN')}` : null} />
            <InfoRow label="Joined" value={teacher.joinDate || teacher.join_date} />
          </div>
        )}
      </div>

      {/* Salary History */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-gray-900">Salary History</h2>
        <Table
          columns={salaryColumns}
          data={salaryList}
          loading={false}
        />
      </div>
    </div>
  )
}
