import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, CalendarDays, CheckCircle } from 'lucide-react'
import { schoolApi } from '../../api/school'
import Modal from '../../components/common/Modal'

const schema = z.object({
  year: z.coerce.number().min(2000).max(2100),
  label: z.string().min(1, 'Label is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})

export default function CalendarYears() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: years, isLoading } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data) => schoolApi.createCalendarYear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-years'] })
      toast.success('Calendar year created')
      setShowModal(false)
      reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const setCurrentMutation = useMutation({
    mutationFn: (id) => schoolApi.setCurrentYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-years'] })
      toast.success('Current year updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar Years</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Year
        </button>
      </div>

      {isLoading ? (
        <div className="card text-center text-sm text-gray-500">{t('loading')}</div>
      ) : (
        <div className="space-y-3">
          {yearList.length === 0 && (
            <div className="card text-center text-sm text-gray-500">{t('table.no_data')}</div>
          )}
          {yearList.map((yr) => (
            <div key={yr.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CalendarDays className="h-8 w-8 text-primary-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{yr.label || yr.year}</span>
                    {yr.isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="h-3 w-3" /> Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {yr.startDate || yr.start_date} – {yr.endDate || yr.end_date}
                  </p>
                </div>
              </div>
              {!yr.isCurrent && (
                <button
                  onClick={() => setCurrentMutation.mutate(yr.id)}
                  disabled={setCurrentMutation.isPending}
                  className="btn-secondary text-sm"
                >
                  Set as Current
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Calendar Year">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Year (e.g. 2025)</label>
            <input type="number" {...register('year')} className="input-field" placeholder="2025" />
            {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
          </div>
          <div>
            <label className="label">Label (e.g. 2025-26)</label>
            <input {...register('label')} className="input-field" placeholder="2025-26" />
            {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label.message}</p>}
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" {...register('startDate')} className="input-field" />
            {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" {...register('endDate')} className="input-field" />
            {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate.message}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              {t('buttons.cancel')}
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : t('buttons.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
