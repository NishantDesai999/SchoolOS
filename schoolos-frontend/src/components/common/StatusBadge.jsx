import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

const STATUS_COLORS = {
  // Invoice / Payment
  paid:         'bg-green-100 text-green-800',
  pending:      'bg-yellow-100 text-yellow-800',
  partial:      'bg-blue-100 text-blue-800',
  overdue:      'bg-red-100 text-red-800',
  waived:       'bg-gray-100 text-gray-800',
  success:      'bg-green-100 text-green-800',
  failed:       'bg-red-100 text-red-800',
  refunded:     'bg-purple-100 text-purple-800',
  // Student
  active:       'bg-green-100 text-green-800',
  inactive:     'bg-gray-100 text-gray-800',
  enrolled:     'bg-blue-100 text-blue-800',
  promoted:     'bg-teal-100 text-teal-800',
  detained:     'bg-orange-100 text-orange-800',
  alumni:       'bg-purple-100 text-purple-800',
  tc_issued:    'bg-gray-100 text-gray-700',
  // SLC
  issued:       'bg-green-100 text-green-800',
  cancelled:    'bg-red-100 text-red-800',
  // Admission
  inquiry:      'bg-yellow-100 text-yellow-800',
  submitted:    'bg-blue-100 text-blue-800',
  under_review: 'bg-indigo-100 text-indigo-800',
  approved:     'bg-green-100 text-green-800',
  rejected:     'bg-red-100 text-red-800',
  // OCR
  extracted:    'bg-green-100 text-green-800',
  manual:       'bg-yellow-100 text-yellow-800',
}

export default function StatusBadge({ status, className }) {
  const { t } = useTranslation('common')
  const key = status?.toLowerCase?.()
  const color = STATUS_COLORS[key] || 'bg-gray-100 text-gray-800'
  const label = t(`status.${key}`, { defaultValue: status })

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        color,
        className
      )}
    >
      {label}
    </span>
  )
}
