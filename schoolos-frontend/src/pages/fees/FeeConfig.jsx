import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit } from 'lucide-react'
import { feesApi } from '../../api/fees'
import { schoolApi } from '../../api/school'

const itemSchema = z.object({
  fee_type: z.string().min(1, 'Fee type is required'),
  label: z.string().min(1, 'Label is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
})

const FEE_TYPES = ['TUITION', 'EXAM', 'SPORTS', 'LIBRARY', 'TRANSPORT', 'MISCELLANEOUS']

export default function FeeConfig() {
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data: feeConfig, isLoading } = useQuery({
    queryKey: ['fee-config', selectedYear, selectedGrade],
    queryFn: () => feesApi.getConfig(selectedYear, selectedGrade),
    enabled: !!selectedYear && !!selectedGrade,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(itemSchema),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []
  const config = feeConfig?.config || feeConfig || {}
  const items = config.items || feeConfig?.items || []
  const configId = config.id || feeConfig?.id

  const createConfigMutation = useMutation({
    mutationFn: (data) => configId
      ? feesApi.addItem(configId, data)
      : feesApi.createConfig({ year: selectedYear, grade: selectedGrade, items: [data] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] })
      toast.success('Fee item added')
      setShowAddItem(false)
      reset()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }) => feesApi.updateItem(configId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] })
      toast.success('Fee item updated')
      setEditItem(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => feesApi.deleteItem(configId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] })
      toast.success('Fee item removed')
    },
    onError: (err) => toast.error(err.message),
  })

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fee Configuration</h1>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4">
        <div>
          <label className="label">Academic Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input-field">
            <option value="">-- Select Year --</option>
            {yearList.map((yr) => (
              <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Grade Level</label>
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="input-field">
            <option value="">-- Select Grade --</option>
            {['LKG', 'UKG', ...Array.from({ length: 12 }, (_, i) => i + 1)].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedYear && selectedGrade && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Fee Breakdown</h2>
            <button onClick={() => setShowAddItem(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">{tc('loading')}</p>
          ) : (
            <>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No fee items configured. Add items above.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-left font-medium text-gray-500">Fee Type</th>
                      <th className="py-2 text-left font-medium text-gray-500">Label</th>
                      <th className="py-2 text-right font-medium text-gray-500">Amount (₹)</th>
                      <th className="py-2 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        {editItem === item.id ? (
                          <EditItemRow
                            item={item}
                            onSave={(data) => updateItemMutation.mutate({ itemId: item.id, data })}
                            onCancel={() => setEditItem(null)}
                          />
                        ) : (
                          <>
                            <td className="py-2 text-gray-700">{item.feeType || item.fee_type}</td>
                            <td className="py-2 text-gray-900">{item.label}</td>
                            <td className="py-2 text-right text-gray-900">
                              ₹{Number(item.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditItem(item.id)} className="text-gray-400 hover:text-gray-600">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    <tr className="border-t border-gray-300 font-semibold">
                      <td colSpan={2} className="py-2 text-gray-900">Total</td>
                      <td className="py-2 text-right text-gray-900">₹{total.toLocaleString('en-IN')}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Add Item Form */}
              {showAddItem && (
                <form onSubmit={handleSubmit((d) => createConfigMutation.mutate(d))} className="space-y-3 border-t pt-3">
                  <h3 className="font-medium text-gray-900 text-sm">Add Fee Item</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label">Fee Type</label>
                      <select {...register('fee_type')} className="input-field">
                        <option value="">-- Select --</option>
                        {FEE_TYPES.map((ft) => (
                          <option key={ft} value={ft}>{ft}</option>
                        ))}
                      </select>
                      {errors.fee_type && <p className="mt-1 text-xs text-red-600">{errors.fee_type.message}</p>}
                    </div>
                    <div>
                      <label className="label">Label</label>
                      <input {...register('label')} className="input-field" placeholder="e.g. Annual Tuition Fee" />
                      {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label.message}</p>}
                    </div>
                    <div>
                      <label className="label">Amount (₹)</label>
                      <input type="number" {...register('amount')} className="input-field" />
                      {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createConfigMutation.isPending} className="btn-primary text-sm">
                      {createConfigMutation.isPending ? 'Adding...' : 'Add Item'}
                    </button>
                    <button type="button" onClick={() => { setShowAddItem(false); reset() }} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EditItemRow({ item, onSave, onCancel }) {
  const [data, setData] = useState({
    fee_type: item.feeType || item.fee_type,
    label: item.label,
    amount: item.amount,
  })

  return (
    <>
      <td className="py-1">
        <select value={data.fee_type} onChange={(e) => setData({ ...data, fee_type: e.target.value })} className="input-field text-xs">
          {['TUITION', 'EXAM', 'SPORTS', 'LIBRARY', 'TRANSPORT', 'MISCELLANEOUS'].map((ft) => (
            <option key={ft} value={ft}>{ft}</option>
          ))}
        </select>
      </td>
      <td className="py-1">
        <input value={data.label} onChange={(e) => setData({ ...data, label: e.target.value })} className="input-field text-xs" />
      </td>
      <td className="py-1">
        <input type="number" value={data.amount} onChange={(e) => setData({ ...data, amount: e.target.value })} className="input-field text-xs text-right" />
      </td>
      <td className="py-1">
        <div className="flex gap-1">
          <button onClick={() => onSave(data)} className="text-xs text-green-600 hover:text-green-800 px-1">Save</button>
          <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 px-1">Cancel</button>
        </div>
      </td>
    </>
  )
}
