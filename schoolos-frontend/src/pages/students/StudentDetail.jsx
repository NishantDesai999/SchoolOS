import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit, BookOpen } from 'lucide-react'
import { studentsApi } from '../../api/students'
import { feesApi } from '../../api/fees'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import Table from '../../components/common/Table'
import { StudentFeeCalculator } from '../fees/FeeCalculator'

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
  const { t: tf } = useTranslation('fees')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.getById(id),
  })

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['student-ledger', id],
    queryFn: () => feesApi.getStudentLedger(id),
    enabled: !!id && activeTab === 'fees',
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

  const guardian = student.guardians?.[0] || student.guardian || {}
  const enrollment = student.currentEnrollment || student.enrollments?.[0] || {}

  const ledgerEntries = Array.isArray(ledger) ? ledger : ledger?.data || []
  const totalPaid = ledgerEntries.reduce((s, e) => s + Number(e.paid || 0), 0)
  const totalDue  = ledgerEntries.filter(e => e.type === 'INVOICE').reduce((s, e) => s + Number(e.balance || 0), 0)

  const ledgerColumns = [
    { key: 'reference', header: 'Reference', render: (v) => v || '—' },
    { key: 'period', header: 'Period', render: (v) => v || '—' },
    { key: 'amount', header: 'Amount', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    { key: 'paid', header: 'Paid', render: (v) => `₹${Number(v || 0).toLocaleString('en-IN')}` },
    {
      key: 'balance',
      header: 'Balance',
      render: (v, row) => row.type === 'DIRECT_PAYMENT' ? '—' : (
        <span className={Number(v) > 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
          ₹{Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => v ? <StatusBadge status={v?.toLowerCase()} /> : '—',
    },
  ]

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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fees'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tf('fee_tab')}
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
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
          </div>
        </div>
      )}

      {/* Fees Tab */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Fee summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="stat-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                <span className="text-sm font-bold text-white">₹</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="text-xl font-bold text-green-700">₹{totalPaid.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600">
                <span className="text-sm font-bold text-white">₹</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className={`text-xl font-bold ${totalDue > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  ₹{totalDue.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Collect Fee section */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">{tf('collect_fee')}</h2>
            <StudentFeeCalculator
              studentId={id}
              studentName={`${student.firstName || student.first_name} ${student.lastName || student.last_name}`}
              grNumber={student.grNumber || student.gr_number}
              onCollected={() => queryClient.invalidateQueries({ queryKey: ['student-ledger', id] })}
            />
          </div>

          {/* Ledger */}
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">{tf('ledger_tab')}</h2>
            <Table
              columns={ledgerColumns}
              data={ledgerEntries}
              loading={ledgerLoading}
            />
          </div>
        </div>
      )}

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
