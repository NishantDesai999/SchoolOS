import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { useEffect } from 'react'

export default function DigestSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['digest-settings'],
    queryFn: () => axiosClient.get('/digest/settings'),
  })

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (settings) {
      reset({
        ownerEmail: settings.ownerEmail || '',
        ownerWhatsapp: settings.ownerWhatsapp || '',
        digestTime: settings.digestTime ? settings.digestTime.slice(0, 5) : '20:00',
      })
    }
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (data) => axiosClient.put('/digest/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-settings'] })
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Digest Settings</h1>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Owner Email</label>
                <input {...register('ownerEmail')} type="email" className="input-field" placeholder="principal@school.com" />
                <p className="mt-1 text-xs text-gray-500">Daily digest will be sent to this email</p>
              </div>
              <div>
                <label className="label">WhatsApp (Optional)</label>
                <input {...register('ownerWhatsapp')} type="tel" className="input-field" placeholder="+91 9999999999" />
              </div>
              <div>
                <label className="label">Digest Time (24h)</label>
                <input {...register('digestTime')} type="time" className="input-field" />
                <p className="mt-1 text-xs text-gray-500">Time to send the daily digest</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                <Save className="h-4 w-4" />
                {mutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
