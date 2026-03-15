import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { feesApi } from '../../api/fees'
import { schoolApi } from '../../api/school'

export default function FeeCalculator() {
  const { t: tc } = useTranslation('common')
  const [grInput, setGrInput] = useState('')
  const [searchGr, setSearchGr] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['fee-calculate', searchGr, selectedYear],
    queryFn: () => feesApi.calculate(searchGr, selectedYear),
    enabled: !!searchGr,
    retry: false,
  })

  const yearList = Array.isArray(years) ? years : years?.data || []

  const handleSearch = (e) => {
    e.preventDefault()
    if (grInput.trim()) setSearchGr(grInput.trim())
  }

  const items = result?.items || result?.breakdown || []
  const student = result?.student || {}
  const total = result?.total || items.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fee Calculator</h1>

      <div className="card space-y-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter GR number..."
              value={grInput}
              onChange={(e) => setGrInput(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="input-field w-40"
          >
            <option value="">Current Year</option>
            {yearList.map((yr) => (
              <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Calculate
          </button>
        </form>

        {isLoading && <p className="text-sm text-gray-500">{tc('loading')}</p>}
        {error && <p className="text-sm text-red-600">Student not found or no fee config for this year.</p>}
      </div>

      {result && (
        <div className="card">
          {/* Student info */}
          {student.name && (
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">{student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}</p>
              <p className="text-gray-500">GR: {student.grNumber || student.gr_number}</p>
            </div>
          )}

          <h2 className="mb-3 font-semibold text-gray-900">Fee Breakdown</h2>

          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No fee configuration found for this student.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left font-medium text-gray-500">Fee Type</th>
                  <th className="py-2 text-left font-medium text-gray-500">Label</th>
                  <th className="py-2 text-right font-medium text-gray-500">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-700">{item.feeType || item.fee_type}</td>
                    <td className="py-2 text-gray-900">{item.label}</td>
                    <td className="py-2 text-right text-gray-900">
                      ₹{Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={2} className="py-2 text-gray-900">Total</td>
                  <td className="py-2 text-right text-gray-900">
                    ₹{Number(total).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
