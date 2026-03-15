import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { schoolApi } from '../../api/school'

const personalSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  blood_group: z.string().optional(),
  aadhar_number: z.string().optional(),
})

const guardianSchema = z.object({
  guardian_name: z.string().min(1, 'Guardian name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})

const enrollmentSchema = z.object({
  year_id: z.string().min(1, 'Year is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  roll_number: z.string().optional(),
})

const STEPS = ['Personal Info', 'Guardian Info', 'Enrollment']

export default function StudentOnboarding() {
  const { t } = useTranslation('students')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({})

  const personalForm = useForm({ resolver: zodResolver(personalSchema) })
  const guardianForm = useForm({ resolver: zodResolver(guardianSchema) })
  const enrollmentForm = useForm({ resolver: zodResolver(enrollmentSchema) })

  const watchYearId = enrollmentForm.watch('year_id')
  const watchClassId = enrollmentForm.watch('class_id')

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes', watchYearId],
    queryFn: () => schoolApi.listClasses(watchYearId),
    enabled: !!watchYearId,
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', watchClassId],
    queryFn: () => schoolApi.listSections(watchClassId),
    enabled: !!watchClassId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => studentsApi.create(data),
    onSuccess: (student) => {
      toast.success('Student created successfully!')
      navigate(`/students/${student?.id || student?.data?.id || ''}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []
  const classList = Array.isArray(classes) ? classes : classes?.data || []
  const sectionList = Array.isArray(sections) ? sections : sections?.data || []

  const handlePersonalNext = personalForm.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, ...data }))
    setStep(1)
  })

  const handleGuardianNext = guardianForm.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, guardian: data }))
    setStep(2)
  })

  const handleEnrollmentSubmit = enrollmentForm.handleSubmit((data) => {
    const payload = {
      ...formData,
      enrollment: data,
    }
    createMutation.mutate(payload)
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('onboarding_title')}</h1>

      {/* Step indicator */}
      <div className="flex items-center">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              i < step ? 'bg-green-600 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="mx-4 flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 0: Personal Info */}
      {step === 0 && (
        <form onSubmit={handlePersonalNext} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">{t('step_personal')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('first_name')} *</label>
              <input {...personalForm.register('first_name')} className="input-field" />
              {personalForm.formState.errors.first_name && (
                <p className="mt-1 text-xs text-red-600">{personalForm.formState.errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="label">{t('last_name')} *</label>
              <input {...personalForm.register('last_name')} className="input-field" />
              {personalForm.formState.errors.last_name && (
                <p className="mt-1 text-xs text-red-600">{personalForm.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('date_of_birth')} *</label>
              <input type="date" {...personalForm.register('date_of_birth')} className="input-field" />
              {personalForm.formState.errors.date_of_birth && (
                <p className="mt-1 text-xs text-red-600">{personalForm.formState.errors.date_of_birth.message}</p>
              )}
            </div>
            <div>
              <label className="label">{t('gender')} *</label>
              <select {...personalForm.register('gender')} className="input-field">
                <option value="">-- Select --</option>
                <option value="MALE">{t('gender_male')}</option>
                <option value="FEMALE">{t('gender_female')}</option>
                <option value="OTHER">{t('gender_other')}</option>
              </select>
              {personalForm.formState.errors.gender && (
                <p className="mt-1 text-xs text-red-600">{personalForm.formState.errors.gender.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input {...personalForm.register('address')} className="input-field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">City</label>
              <input {...personalForm.register('city')} className="input-field" />
            </div>
            <div>
              <label className="label">State</label>
              <input {...personalForm.register('state')} className="input-field" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('blood_group')}</label>
              <select {...personalForm.register('blood_group')} className="input-field">
                <option value="">-- Select --</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('aadhaar')}</label>
              <input {...personalForm.register('aadhar_number')} className="input-field" placeholder="XXXX XXXX XXXX" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              {tc('buttons.next')} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 1: Guardian Info */}
      {step === 1 && (
        <form onSubmit={handleGuardianNext} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">{t('step_guardian')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('guardian_name')} *</label>
              <input {...guardianForm.register('guardian_name')} className="input-field" />
              {guardianForm.formState.errors.guardian_name && (
                <p className="mt-1 text-xs text-red-600">{guardianForm.formState.errors.guardian_name.message}</p>
              )}
            </div>
            <div>
              <label className="label">{t('guardian_relation')} *</label>
              <select {...guardianForm.register('relationship')} className="input-field">
                <option value="">-- Select --</option>
                <option value="FATHER">{t('relation_father')}</option>
                <option value="MOTHER">{t('relation_mother')}</option>
                <option value="GUARDIAN">{t('relation_guardian')}</option>
              </select>
              {guardianForm.formState.errors.relationship && (
                <p className="mt-1 text-xs text-red-600">{guardianForm.formState.errors.relationship.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('guardian_phone')} *</label>
              <input {...guardianForm.register('phone')} className="input-field" placeholder="10-digit phone" />
              {guardianForm.formState.errors.phone && (
                <p className="mt-1 text-xs text-red-600">{guardianForm.formState.errors.phone.message}</p>
              )}
            </div>
            <div>
              <label className="label">{t('guardian_email')}</label>
              <input type="email" {...guardianForm.register('email')} className="input-field" />
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(0)} className="btn-secondary">
              <ChevronLeft className="h-4 w-4" /> {tc('buttons.back')}
            </button>
            <button type="submit" className="btn-primary">
              {tc('buttons.next')} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Enrollment */}
      {step === 2 && (
        <form onSubmit={handleEnrollmentSubmit} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">{t('step_enrollment')}</h2>
          <div>
            <label className="label">Academic Year *</label>
            <select {...enrollmentForm.register('year_id')} className="input-field">
              <option value="">-- Select Year --</option>
              {yearList.map((yr) => (
                <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
              ))}
            </select>
            {enrollmentForm.formState.errors.year_id && (
              <p className="mt-1 text-xs text-red-600">{enrollmentForm.formState.errors.year_id.message}</p>
            )}
          </div>
          <div>
            <label className="label">Class *</label>
            <select {...enrollmentForm.register('class_id')} className="input-field" disabled={!watchYearId}>
              <option value="">-- Select Class --</option>
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            {enrollmentForm.formState.errors.class_id && (
              <p className="mt-1 text-xs text-red-600">{enrollmentForm.formState.errors.class_id.message}</p>
            )}
          </div>
          <div>
            <label className="label">Section *</label>
            <select {...enrollmentForm.register('section_id')} className="input-field" disabled={!watchClassId}>
              <option value="">-- Select Section --</option>
              {sectionList.map((sec) => (
                <option key={sec.id} value={sec.id}>Section {sec.name}</option>
              ))}
            </select>
            {enrollmentForm.formState.errors.section_id && (
              <p className="mt-1 text-xs text-red-600">{enrollmentForm.formState.errors.section_id.message}</p>
            )}
          </div>
          <div>
            <label className="label">{t('roll_number')}</label>
            <input {...enrollmentForm.register('roll_number')} className="input-field" placeholder="Optional" />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              <ChevronLeft className="h-4 w-4" /> {tc('buttons.back')}
            </button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
