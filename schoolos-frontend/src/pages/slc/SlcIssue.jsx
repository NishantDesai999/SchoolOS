import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Search } from 'lucide-react'
import { slcApi } from '../../api/slc'
import { studentsApi } from '../../api/students'
import SignatureCanvas from '../../components/common/SignatureCanvas'

const schema = z.object({
  gr_number: z.string().min(1, 'GR number is required'),
  leaving_date: z.string().min(1, 'Leaving date is required'),
  reason: z.string().min(1, 'Reason is required'),
  last_class: z.string().optional(),
  last_section: z.string().optional(),
  conduct: z.string().optional(),
  remark: z.string().optional(),
})

export default function SlcIssue() {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [signature, setSignature] = useState(null)
  const [lookupGr, setLookupGr] = useState(searchParams.get('gr') || '')
  const [searchedGr, setSearchedGr] = useState(searchParams.get('gr') || '')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      gr_number: searchParams.get('gr') || '',
      leaving_date: new Date().toISOString().split('T')[0],
      conduct: 'Good',
    },
  })

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-lookup', searchedGr],
    queryFn: () => studentsApi.lookupByGr(searchedGr),
    enabled: !!searchedGr,
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: (data) => slcApi.issue({ ...data, signature }),
    onSuccess: (slc) => {
      toast.success('SLC issued successfully')
      const slcId = slc?.id || slc?.data?.id
      navigate(slcId ? `/slc/${slcId}` : '/slc')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleLookup = () => {
    if (lookupGr.trim()) {
      setSearchedGr(lookupGr.trim())
      setValue('gr_number', lookupGr.trim())
    }
  }

  const enrollment = student?.currentEnrollment || student?.enrollments?.[0] || {}

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/slc')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Issue SLC</h1>
      </div>

      {/* Student Search */}
      <div className="card space-y-3">
        <label className="label">Search Student by GR Number</label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter GR number..."
            value={lookupGr}
            onChange={(e) => setLookupGr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            className="input-field flex-1"
          />
          <button onClick={handleLookup} className="btn-secondary">
            <Search className="h-4 w-4" />
          </button>
        </div>

        {studentLoading && <p className="text-sm text-gray-500">{tc('loading')}</p>}

        {student && (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-900">
              {student.firstName || student.first_name} {student.lastName || student.last_name}
            </p>
            <p className="text-green-700">GR: {student.grNumber || student.gr_number}</p>
            {enrollment.className && (
              <p className="text-green-700">
                Class: {enrollment.className} {enrollment.sectionName ? `- ${enrollment.sectionName}` : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* SLC Form */}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card space-y-4">
        <input type="hidden" {...register('gr_number')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Leaving Date *</label>
            <input type="date" {...register('leaving_date')} className="input-field" />
            {errors.leaving_date && <p className="mt-1 text-xs text-red-600">{errors.leaving_date.message}</p>}
          </div>
          <div>
            <label className="label">Reason *</label>
            <input {...register('reason')} className="input-field" placeholder="e.g. Migration to another city" />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Last Class</label>
            <input
              {...register('last_class')}
              className="input-field"
              defaultValue={enrollment.className || ''}
              placeholder="e.g. Class 5"
            />
          </div>
          <div>
            <label className="label">Last Section</label>
            <input
              {...register('last_section')}
              className="input-field"
              defaultValue={enrollment.sectionName || ''}
              placeholder="e.g. A"
            />
          </div>
        </div>

        <div>
          <label className="label">Conduct</label>
          <select {...register('conduct')} className="input-field">
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Satisfactory">Satisfactory</option>
          </select>
        </div>

        <div>
          <label className="label">Remark</label>
          <textarea {...register('remark')} className="input-field" rows={2} />
        </div>

        {/* Signature */}
        <SignatureCanvas
          label="Principal Signature"
          onSave={(dataUrl) => setSignature(dataUrl)}
        />
        {signature && (
          <p className="text-xs text-green-600">Signature saved</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/slc')} className="btn-secondary">
            {tc('buttons.cancel')}
          </button>
          <button type="submit" disabled={mutation.isPending || !student} className="btn-primary">
            {mutation.isPending ? 'Issuing...' : 'Issue SLC'}
          </button>
        </div>
      </form>
    </div>
  )
}
