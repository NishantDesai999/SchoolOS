import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useKeycloak } from '@react-keycloak/web'
import { useNavigate } from 'react-router-dom'
import { IndianRupee, UserPlus } from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { useSchool } from '../../context/SchoolContext'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="stat-card w-full text-left hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </button>
  )
}

function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map((d) => Number(d.total || 0)), 1)

  return (
    <div className="flex items-end gap-1 h-40 w-full">
      {data.map((d, i) => {
        const pct = (Number(d.total || 0) / maxVal) * 100
        const hasValue = Number(d.total) > 0
        return (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-1">
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{
                height: `${Math.max(pct, hasValue ? 4 : 0)}%`,
                backgroundColor: hasValue ? 'rgb(79 70 229)' : 'rgb(229 231 235)',
              }}
              title={`₹${Number(d.total).toLocaleString('en-IN')}`}
            />
            <span className="text-[10px] text-gray-400">{MONTHS[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation('dashboard')
  const { keycloak } = useKeycloak()
  const navigate = useNavigate()
  const name = keycloak.tokenParsed?.name || keycloak.tokenParsed?.email || 'Admin'

  const { schoolId } = useSchool()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', schoolId],
    queryFn: () => axiosClient.get('/dashboard/stats'),
    retry: false,
  })

  const { data: monthlyFees } = useQuery({
    queryKey: ['dashboard-monthly-fees', selectedYear, schoolId],
    queryFn: () => axiosClient.get(`/dashboard/monthly-fees?year=${selectedYear}`),
    retry: false,
  })

  const monthlyData = Array.isArray(monthlyFees) ? monthlyFees : monthlyFees?.data || []
  const yearTotal = monthlyData.reduce((s, d) => s + Number(d.total || 0), 0)

  const yearOptions = []
  for (let y = currentYear; y >= currentYear - 3; y--) yearOptions.push(y)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('welcome', { name })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* 2 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={IndianRupee}
          label="Fee Collected Today"
          value={stats?.feesCollectedToday != null
            ? `₹${Number(stats.feesCollectedToday).toLocaleString('en-IN')}`
            : null}
          color="bg-green-600"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          icon={UserPlus}
          label="New Students This Month"
          value={stats?.newStudentsThisMonth ?? null}
          color="bg-indigo-600"
          onClick={() => navigate('/students')}
        />
      </div>

      {/* Monthly Fees Bar Chart */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Monthly Fee Collection</h2>
            <p className="text-sm text-gray-500">
              Total {selectedYear}: ₹{yearTotal.toLocaleString('en-IN')}
            </p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-field w-28 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <MonthlyBarChart data={monthlyData} />
      </div>
    </div>
  )
}
