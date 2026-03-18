import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Trash2, Copy } from 'lucide-react'
import { schoolApi } from '../../api/school'
import Modal from '../../components/common/Modal'

const classSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade_level: z.coerce.number().min(1).max(12),
})

const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
})

export default function ClassSectionSetup() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [showAddClass, setShowAddClass] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneFromYearId, setCloneFromYearId] = useState('')

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', selectedYearId],
    queryFn: () => schoolApi.listClasses(selectedYearId),
    enabled: !!selectedYearId,
  })

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections', selectedClassId],
    queryFn: () => schoolApi.listSections(selectedClassId),
    enabled: !!selectedClassId,
  })

  const classForm = useForm({ resolver: zodResolver(classSchema) })
  const sectionForm = useForm({ resolver: zodResolver(sectionSchema) })

  const createClassMutation = useMutation({
    mutationFn: (data) => schoolApi.createClass({ ...data, calendarYearId: selectedYearId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', selectedYearId] })
      toast.success('Class added')
      setShowAddClass(false)
      classForm.reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteClassMutation = useMutation({
    mutationFn: (id) => schoolApi.deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', selectedYearId] })
      if (selectedClassId) setSelectedClassId(null)
      toast.success('Class deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const createSectionMutation = useMutation({
    mutationFn: (data) => schoolApi.createSection({ ...data, classId: selectedClassId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', selectedClassId] })
      toast.success('Section added')
      sectionForm.reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => schoolApi.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', selectedClassId] })
      toast.success('Section deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const cloneMutation = useMutation({
    mutationFn: () => schoolApi.cloneClasses(cloneFromYearId, selectedYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', selectedYearId] })
      toast.success('Classes cloned successfully')
      setShowCloneModal(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const classList = Array.isArray(classes) ? classes : classes?.data || []
  const sectionList = Array.isArray(sections) ? sections : sections?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Classes & Sections</h1>
      </div>

      {/* Year selector */}
      <div className="card">
        <label className="label">Select Academic Year</label>
        <select
          value={selectedYearId}
          onChange={(e) => { setSelectedYearId(e.target.value); setSelectedClassId(null) }}
          className="input-field max-w-xs"
        >
          <option value="">-- Select Year --</option>
          {yearList.map((yr) => (
            <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
          ))}
        </select>
      </div>

      {selectedYearId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Classes */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Classes</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCloneModal(true)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Clone
                </button>
                <button
                  onClick={() => setShowAddClass(true)}
                  className="btn-primary text-sm flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {classesLoading ? (
              <p className="text-sm text-gray-500">{t('loading')}</p>
            ) : classList.length === 0 ? (
              <p className="text-sm text-gray-500">{t('table.no_data')}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {classList.map((cls) => (
                  <li
                    key={cls.id}
                    className={`flex items-center justify-between py-2 px-2 rounded cursor-pointer hover:bg-gray-50 ${selectedClassId === cls.id ? 'bg-primary-50' : ''}`}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <div>
                      <span className="font-medium text-sm text-gray-900">{cls.name}</span>
                      <span className="ml-2 text-xs text-gray-500">Grade {cls.gradeLevel || cls.grade_level}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteClassMutation.mutate(cls.id) }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showAddClass && (
              <form onSubmit={classForm.handleSubmit((d) => createClassMutation.mutate(d))} className="space-y-3 border-t pt-3">
                <div>
                  <label className="label">Class Name</label>
                  <input {...classForm.register('name')} className="input-field" placeholder="e.g. Class 1" />
                  {classForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-red-600">{classForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">Grade Level</label>
                  <input type="number" {...classForm.register('grade_level')} className="input-field" placeholder="1" />
                  {classForm.formState.errors.grade_level && (
                    <p className="mt-1 text-xs text-red-600">{classForm.formState.errors.grade_level.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={createClassMutation.isPending} className="btn-primary text-sm">
                    {createClassMutation.isPending ? 'Adding...' : 'Add Class'}
                  </button>
                  <button type="button" onClick={() => setShowAddClass(false)} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Sections */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900">
              Sections {selectedClassId ? `for ${classList.find(c => c.id === selectedClassId)?.name || ''}` : ''}
            </h2>

            {!selectedClassId ? (
              <p className="text-sm text-gray-500">Select a class to manage sections</p>
            ) : sectionsLoading ? (
              <p className="text-sm text-gray-500">{t('loading')}</p>
            ) : (
              <>
                {sectionList.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('table.no_data')}</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {sectionList.map((sec) => (
                      <li key={sec.id} className="flex items-center justify-between py-2">
                        <span className="font-medium text-sm text-gray-900">Section {sec.name}</span>
                        <button
                          onClick={() => deleteSectionMutation.mutate(sec.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={sectionForm.handleSubmit((d) => createSectionMutation.mutate(d))} className="flex gap-2 border-t pt-3">
                  <input
                    {...sectionForm.register('name')}
                    className="input-field flex-1"
                    placeholder="Section name (e.g. A)"
                  />
                  <button type="submit" disabled={createSectionMutation.isPending} className="btn-primary text-sm">
                    <Plus className="h-4 w-4" />
                  </button>
                </form>
                {sectionForm.formState.errors.name && (
                  <p className="text-xs text-red-600">{sectionForm.formState.errors.name.message}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Clone Modal */}
      <Modal isOpen={showCloneModal} onClose={() => setShowCloneModal(false)} title="Clone Classes from Year">
        <div className="space-y-4">
          <div>
            <label className="label">Clone from Year</label>
            <select
              value={cloneFromYearId}
              onChange={(e) => setCloneFromYearId(e.target.value)}
              className="input-field"
            >
              <option value="">-- Select source year --</option>
              {yearList.filter((yr) => yr.id !== selectedYearId).map((yr) => (
                <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCloneModal(false)} className="btn-secondary">
              {t('buttons.cancel')}
            </button>
            <button
              onClick={() => cloneMutation.mutate()}
              disabled={!cloneFromYearId || cloneMutation.isPending}
              className="btn-primary"
            >
              {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
