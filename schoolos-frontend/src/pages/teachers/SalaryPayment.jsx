import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { teachersApi } from '../../api/teachers'

const schema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
  base_salary: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0).default(0),
  net_paid: z.coerce.number().min(0),
  payment_date: z.string().min(1, 'Payment date required'),
  payment_mode: z.enum(['CASH', 'CHEQUE', 'ONLINE']),
  notes: z.string().optional(),
})

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function SalaryPayment() {
  const { id } = useParams()
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: teacher } = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => teachersApi.getById(id),
  })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
      base_salary: 0,
      deductions: 0,
      net_paid: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'CASH',
    },
  })

  // Pre-fill base salary when teacher loads
  const baseSalary = watch('base_salary')
  const deductions = watch('deductions')

  const mutation = useMutation({
    mutationFn: (data) => teachersApi.recordSalary(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-salary', id] })
      toast.success('Salary payment recorded')
      navigate(`/teachers/${id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  // Auto-set base salary from teacher profile
  const handleBaseSalaryFocus = () => {
    if (!baseSalary && teacher?.salary) {
      setValue('base_salary', teacher.salary)
      setValue('net_paid', teacher.salary - (deductions || 0))
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/teachers/${id}`)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Salary Payment</h1>
          {teacher && (
            <p className="text-sm text-gray-500">
              {teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Month *</label>
            <select {...register('month')} className="input-field">
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            {errors.month && <p className="mt-1 text-xs text-red-600">{errors.month.message}</p>}
          </div>
          <div>
            <label className="label">Year *</label>
            <input type="number" {...register('year')} className="input-field" />
            {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Base Salary (₹) *</label>
          <input
            type="number"
            {...register('base_salary')}
            className="input-field"
            onFocus={handleBaseSalaryFocus}
            onChange={(e) => {
              register('base_salary').onChange(e)
              const base = Number(e.target.value)
              const ded = Number(watch('deductions') || 0)
              setValue('net_paid', Math.max(0, base - ded))
            }}
          />
          {errors.base_salary && <p className="mt-1 text-xs text-red-600">{errors.base_salary.message}</p>}
        </div>

        <div>
          <label className="label">Deductions (₹)</label>
          <input
            type="number"
            {...register('deductions')}
            className="input-field"
            onChange={(e) => {
              register('deductions').onChange(e)
              const ded = Number(e.target.value)
              const base = Number(watch('base_salary') || 0)
              setValue('net_paid', Math.max(0, base - ded))
            }}
          />
        </div>

        <div>
          <label className="label">Net Paid (₹) *</label>
          <input type="number" {...register('net_paid')} className="input-field" />
          {errors.net_paid && <p className="mt-1 text-xs text-red-600">{errors.net_paid.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Payment Date *</label>
            <input type="date" {...register('payment_date')} className="input-field" />
            {errors.payment_date && <p className="mt-1 text-xs text-red-600">{errors.payment_date.message}</p>}
          </div>
          <div>
            <label className="label">Payment Mode *</label>
            <select {...register('payment_mode')} className="input-field">
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} className="input-field" rows={2} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(`/teachers/${id}`)} className="btn-secondary">
            {tc('buttons.cancel')}
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
