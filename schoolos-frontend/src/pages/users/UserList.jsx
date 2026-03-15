import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'
import { usersApi } from '../../api/users'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'PARENT']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const ROLES = ['ADMIN', 'ACCOUNTANT', 'PARENT']

export default function UserList() {
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ACCOUNTANT' },
  })

  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      setShowModal(false)
      reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => usersApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User status updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const users = Array.isArray(data) ? data : data?.data || []

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (v) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {v}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (id, row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleStatusMutation.mutate({
              id,
              status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
            })}
            disabled={toggleStatusMutation.isPending}
            className="text-gray-500 hover:text-gray-700"
            title={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'ACTIVE'
              ? <ToggleRight className="h-5 w-5 text-green-600" />
              : <ToggleLeft className="h-5 w-5 text-gray-400" />
            }
          </button>
          <button
            onClick={() => {
              if (confirm(tc('confirm_delete'))) deleteMutation.mutate(id)
            }}
            disabled={deleteMutation.isPending}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <Table
        columns={columns}
        data={users}
        loading={isLoading}
      />

      {/* Add User Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset() }} title="Add New User">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input {...register('name')} className="input-field" placeholder="Full name" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" {...register('email')} className="input-field" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Role *</label>
            <select {...register('role')} className="input-field">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" {...register('password')} className="input-field" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">
              {tc('buttons.cancel')}
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
