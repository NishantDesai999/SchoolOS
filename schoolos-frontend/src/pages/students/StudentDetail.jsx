import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit, BookOpen, IndianRupee } from 'lucide-react'
import { studentsApi } from '../../api/students'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 sm:w-48">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const { t } = useTranslation('students')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id),
  })

  const { data: invoices } = useQuery({
    queryKey: ['student-invoices', id],
    queryFn: () => studentsApi.getInvoices(id),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => studentsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      toast.success('Status updated')
      setShowStatusModal(false)
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return <div className="card text-center text-sm text-gray-500">{tc('loading')}</div>
  }

  if (!student) {
    return <div className="card text-center text-sm text-gray-500">Student not found</div>
  }

  const invoiceList = Array.isArray(invoices) ? invoices : invoices?.data || []
  const totalDue = invoiceList.reduce((s, inv) => s + (inv.balance || 0), 0)
  const totalPaid = invoiceList.reduce((s, inv) => s + (inv.amountPaid || inv.amount_paid || 0), 0)

  const guardian = student.guardians?.[0] || student.guardian || {}
  const enrollment = student.currentEnrollment || student.enrollments?.[0] || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/students')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {student.firstName || student.first_name} {student.lastName || student.last_name}
          </h1>
          <p className="text-sm text-gray-500">GR: {student.grNumber || student.gr_number}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={student.status} />
          <Link to={`/students/${id}/edit`} className="btn-secondary">
            <Edit className="h-4 w-4" /> {tc('buttons.edit')}
          </Link>
          <button onClick={() => { setNewStatus(student.status); setShowStatusModal(true) }} className="btn-secondary">
            Change Status
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">Personal Information</h2>
            <InfoRow label={t('first_name')} value={student.firstName || student.first_name} />
            <InfoRow label={t('last_name')} value={student.lastName || student.last_name} />
            <InfoRow label={t('date_of_birth')} value={student.dateOfBirth || student.date_of_birth} />
            <InfoRow label={t('gender')} value={student.gender} />
            <InfoRow label={t('blood_group')} value={student.bloodGroup || student.blood_group} />
            <InfoRow label={t('aadhaar')} value={student.aadharNumber || student.aadhar_number} />
            <InfoRow label="Address" value={student.address} />
            <InfoRow label="City" value={student.city} />
            <InfoRow label="State" value={student.state} />
            <InfoRow label="Admission Date" value={student.admissionDate || student.admission_date} />
          </div>

          {/* Guardian Info */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">{t('guardians')}</h2>
            {(student.guardians || (guardian.name ? [guardian] : [])).map((g, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <InfoRow label={t('guardian_name')} value={g.name || g.guardianName} />
                <InfoRow label={t('guardian_relation')} value={g.relationship || g.relation} />
                <InfoRow label={t('guardian_phone')} value={g.phone} />
                <InfoRow label={t('guardian_email')} value={g.email} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Enrollment */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Current Enrollment
            </h2>
            <InfoRow label="Year" value={enrollment.yearLabel || enrollment.year_label} />
            <InfoRow label="Class" value={enrollment.className || enrollment.class_name} />
            <InfoRow label="Section" value={enrollment.sectionName || enrollment.section_name} />
            <InfoRow label={t('roll_number')} value={enrollment.rollNumber || enrollment.roll_number} />
          </div>

          {/* Fee Summary */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" /> Fee Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-medium text-green-700">₹{totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Balance Due</span>
                <span className={`font-medium ${totalDue > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  ₹{totalDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <Link to={`/fees/ledger?studentId=${id}`} className="btn-secondary w-full justify-center">
                View Ledger
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Change Status Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change Student Status">
        <div className="space-y-4">
          <div>
            <label className="label">New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-field">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TC_ISSUED">TC Issued</option>
              <option value="ALUMNI">Alumni</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowStatusModal(false)} className="btn-secondary">
              {tc('buttons.cancel')}
            </button>
            <button
              onClick={() => updateStatusMutation.mutate(newStatus)}
              disabled={updateStatusMutation.isPending}
              className="btn-primary"
            >
              {updateStatusMutation.isPending ? 'Updating...' : tc('buttons.confirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
