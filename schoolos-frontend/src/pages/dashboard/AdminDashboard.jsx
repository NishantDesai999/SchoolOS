import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useKeycloak } from '@react-keycloak/web'
import {
  GraduationCap, Users, IndianRupee, AlertCircle,
  UserPlus, FileText, TrendingUp
} from 'lucide-react'
import axiosClient from '../../api/axiosClient'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation('dashboard')
  const { keycloak } = useKeycloak()
  const name = keycloak.tokenParsed?.name || keycloak.tokenParsed?.email || 'Admin'

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => axiosClient.get('/dashboard/stats'),
    retry: false,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('welcome', { name })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label={t('total_students')}
          value={stats?.totalStudents}
          color="bg-primary-600"
        />
        <StatCard
          icon={Users}
          label={t('total_teachers')}
          value={stats?.totalTeachers}
          color="bg-indigo-600"
        />
        <StatCard
          icon={IndianRupee}
          label={t('fees_collected_today')}
          value={stats?.feesCollectedToday != null
            ? `₹${stats.feesCollectedToday.toLocaleString('en-IN')}`
            : null}
          color="bg-green-600"
        />
        <StatCard
          icon={AlertCircle}
          label={t('pending_dues')}
          value={stats?.pendingDuesCount}
          color="bg-amber-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t('quick_actions')}</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/payments" className="btn-primary">
            <IndianRupee className="h-4 w-4" />
            {t('collect_fee')}
          </a>
          <a href="/slc" className="btn-secondary">
            <FileText className="h-4 w-4" />
            {t('issue_slc')}
          </a>
          <a href="/students/new" className="btn-secondary">
            <UserPlus className="h-4 w-4" />
            {t('new_student')}
          </a>
          <a href="/admissions/new" className="btn-secondary">
            <TrendingUp className="h-4 w-4" />
            {t('new_inquiry')}
          </a>
        </div>
      </div>
    </div>
  )
}
