import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { admissionsApi } from '../../api/students'

const schema = z.object({
  applicant_name: z.string().min(1, 'Applicant name is required'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  grade_applying: z.string().min(1, 'Grade is required'),
  parent_name: z.string().min(1, 'Parent name is required'),
  parent_phone: z.string().min(10, 'Valid phone required'),
  parent_email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export default function InquiryForm() {
  const { t } = useTranslation('admissions')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const createMutation = useMutation({
    mutationFn: (data) => admissionsApi.inquire({
      studentName: data.applicant_name,
      dob: data.date_of_birth || null,
      targetGradeLevel: data.grade_applying ? parseInt(data.grade_applying) : null,
      guardianName: data.parent_name,
      guardianPhone: data.parent_phone,
      guardianEmail: data.parent_email || null,
      notes: data.notes || null,
    }),
    onSuccess: () => {
      toast.success(t('inquiry_success'))
      navigate('/admissions')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admissions')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{t('new_admission_inquiry')}</h1>
      </div>

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="card space-y-5">
        <h2 className="font-semibold text-gray-900 border-b pb-2">{t('applicant_details')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('applicant_name')} *</label>
            <input {...register('applicant_name')} className="input-field" />
            {errors.applicant_name && <p className="mt-1 text-xs text-red-600">{errors.applicant_name.message}</p>}
          </div>
          <div>
            <label className="label">{t('grade_applying')} *</label>
            <select {...register('grade_applying')} className="input-field">
              <option value="">-- Select Grade --</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
            </select>
            {errors.grade_applying && <p className="mt-1 text-xs text-red-600">{errors.grade_applying.message}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('date_of_birth')}</label>
            <input type="date" {...register('date_of_birth')} className="input-field" />
          </div>
          <div>
            <label className="label">{t('gender')}</label>
            <select {...register('gender')} className="input-field">
              <option value="">-- Select --</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <h2 className="font-semibold text-gray-900 border-b pb-2 pt-2">{t('parent_guardian_details')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('parent_name')} *</label>
            <input {...register('parent_name')} className="input-field" />
            {errors.parent_name && <p className="mt-1 text-xs text-red-600">{errors.parent_name.message}</p>}
          </div>
          <div>
            <label className="label">{t('phone')} *</label>
            <input {...register('parent_phone')} className="input-field" placeholder="10-digit phone" />
            {errors.parent_phone && <p className="mt-1 text-xs text-red-600">{errors.parent_phone.message}</p>}
          </div>
        </div>
        <div>
          <label className="label">{t('email')}</label>
          <input type="email" {...register('parent_email')} className="input-field" />
          {errors.parent_email && <p className="mt-1 text-xs text-red-600">{errors.parent_email.message}</p>}
        </div>
        <div>
          <label className="label">{t('address')}</label>
          <input {...register('address')} className="input-field" />
        </div>
        <div>
          <label className="label">{t('notes')}</label>
          <textarea {...register('notes')} className="input-field" rows={3} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/admissions')} className="btn-secondary">
            {tc('buttons.cancel')}
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? t('submitting') : t('submit_inquiry')}
          </button>
        </div>
      </form>
    </div>
  )
}
