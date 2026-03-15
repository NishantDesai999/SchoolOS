import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Send, TrendingUp, IndianRupee, Users, AlertCircle } from 'lucide-react'
import axiosClient from '../../api/axiosClient'

export default function DigestPreview() {
  const { data: preview, isLoading, refetch } = useQuery({
    queryKey: ['digest-preview'],
    queryFn: () => axiosClient.get('/digest/preview'),
  })

  const sendNow = useMutation({
    mutationFn: () => axiosClient.post('/digest/send-now'),
    onSuccess: () => {
      toast.success('Digest sent successfully!')
      refetch()
    },
    onError: () => toast.error('Failed to send digest'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Daily Digest Preview</h1>
        <button
          onClick={() => sendNow.mutate()}
          disabled={sendNow.isPending}
          className="btn-primary"
        >
          <Send className="h-4 w-4" />
          {sendNow.isPending ? 'Sending...' : 'Send Now'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : preview ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Preview for {preview.date || new Date().toLocaleDateString()}</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="stat-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-600">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Students</p>
                <p className="text-2xl font-bold text-gray-900">{preview.activeStudents ?? '—'}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fees Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {preview.feesCollectedToday != null ? `₹${Number(preview.feesCollectedToday).toLocaleString('en-IN')}` : '₹0'}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-600">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Dues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {preview.totalDues != null ? `₹${Number(preview.totalDues).toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">New Admissions</p>
                <p className="text-2xl font-bold text-gray-900">{preview.newAdmissionsThisWeek ?? '—'}</p>
              </div>
            </div>
          </div>

          {preview.alerts && preview.alerts.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold text-gray-900">Alerts</h3>
              <ul className="space-y-2">
                {preview.alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {alert}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="text-center text-gray-500">No digest data available</p>
        </div>
      )}
    </div>
  )
}
