import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save } from 'lucide-react'
import { feesApi } from '../../api/fees'
import { schoolApi } from '../../api/school'

const FEE_TYPES = ['TUITION', 'EXAM', 'SPORTS', 'LIBRARY', 'TRANSPORT', 'MISCELLANEOUS', 'TERM_FEE']

const GRADE_OPTIONS = [
  { label: 'KG / Nursery', value: 0 },
  ...Array.from({ length: 12 }, (_, i) => ({ label: `Grade ${i + 1}`, value: i + 1 })),
]

export default function FeeConfig() {
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()
  const [selectedYear, setSelectedYear] = useState('')   // integer year number e.g. 2025
  const [selectedGrade, setSelectedGrade] = useState('') // integer grade level e.g. 0–12
  const [localItems, setLocalItems] = useState([])
  const [dirty, setDirty] = useState(false)

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data: feeConfig, isLoading } = useQuery({
    queryKey: ['fee-config', selectedYear, selectedGrade],
    queryFn: () => feesApi.getConfig(selectedYear, selectedGrade),
    enabled: !!selectedYear && selectedGrade !== '',
  })

  // Sync fetched items into local state
  useEffect(() => {
    const configs = Array.isArray(feeConfig) ? feeConfig : []
    const items = configs.length > 0 ? (configs[0].items || []) : []
    setLocalItems(items.map((it) => ({ ...it, _key: it.id || crypto.randomUUID() })))
    setDirty(false)
  }, [feeConfig])

  const saveMutation = useMutation({
    mutationFn: () =>
      feesApi.upsertConfig({
        calendarYear: Number(selectedYear),
        gradeLevel: Number(selectedGrade),
        isActive: true,
        items: localItems.map((it, idx) => ({
          type: it.type,
          value: Number(it.value),
          frequency: 'MONTHLY',
          isMandatory: it.isMandatory !== false,
          isRecurring: it.isRecurring !== false,
          gstApplicable: it.gstApplicable || false,
          gstRate: it.gstRate || 0,
          displayOrder: idx,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-config'] })
      toast.success('Fee configuration saved')
      setDirty(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []

  const addItem = () => {
    setLocalItems((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), type: 'TUITION', value: 0, frequency: 'MONTHLY', isMandatory: true },
    ])
    setDirty(true)
  }

  const removeItem = (key) => {
    setLocalItems((prev) => prev.filter((it) => it._key !== key))
    setDirty(true)
  }

  const updateItem = (key, field, val) => {
    setLocalItems((prev) =>
      prev.map((it) => (it._key === key ? { ...it, [field]: val } : it))
    )
    setDirty(true)
  }

  const total = localItems.reduce((sum, it) => sum + Number(it.value || 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fee Configuration</h1>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4">
        <div>
          <label className="label">Academic Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="input-field"
          >
            <option value="">-- Select Year --</option>
            {yearList.map((yr) => (
              <option key={yr.id} value={yr.year}>{yr.label || yr.year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Grade Level</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="input-field"
          >
            <option value="">-- Select Grade --</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedYear && selectedGrade !== '' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Fee Breakdown</h2>
            <div className="flex gap-2">
              <button onClick={addItem} className="btn-secondary text-sm">
                <Plus className="h-4 w-4" /> Add Item
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!dirty || saveMutation.isPending}
                className="btn-primary text-sm"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">{tc('loading')}</p>
          ) : (
            <>
              {localItems.length === 0 ? (
                <p className="text-sm text-gray-500">No fee items configured. Add items above.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 text-left font-medium text-gray-500">Fee Type</th>
                      <th className="py-2 text-right font-medium text-gray-500">Monthly Amount (₹)</th>
                      <th className="py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {localItems.map((item) => (
                      <tr key={item._key}>
                        <td className="py-1">
                          <select
                            value={item.type}
                            onChange={(e) => updateItem(item._key, 'type', e.target.value)}
                            className="input-field text-sm"
                          >
                            {FEE_TYPES.map((ft) => (
                              <option key={ft} value={ft}>{ft}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            value={item.value}
                            onChange={(e) => updateItem(item._key, 'value', e.target.value)}
                            className="input-field text-sm text-right"
                          />
                        </td>
                        <td className="py-1 text-center">
                          <button
                            onClick={() => removeItem(item._key)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-gray-300 font-semibold">
                      <td className="py-2 text-gray-900">Monthly Total</td>
                      <td className="py-2 text-right text-gray-900">
                        ₹{total.toLocaleString('en-IN')}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
