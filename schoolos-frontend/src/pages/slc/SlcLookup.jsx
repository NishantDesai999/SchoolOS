import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, FileText } from 'lucide-react'
import { slcApi } from '../../api/slc'
import StatusBadge from '../../components/common/StatusBadge'

export default function SlcLookup() {
  const { t: tc } = useTranslation('common')
  const [grInput, setGrInput] = useState('')
  const [searchGr, setSearchGr] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['slc-lookup', searchGr],
    queryFn: () => slcApi.lookup(searchGr),
    enabled: !!searchGr,
    retry: false,
  })

  const student = data?.student || data
  const slcs = data?.slcs || data?.slcList || []

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchGr(grInput.trim())
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SLC Lookup</h1>

      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter GR number..."
              value={grInput}
              onChange={(e) => setGrInput(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button type="submit" className="btn-primary">
            {tc('buttons.search')}
          </button>
        </form>
      </div>

      {isLoading && <div className="card text-center text-sm text-gray-500">{tc('loading')}</div>}

      {error && (
        <div className="card text-center text-sm text-red-600">
          Student not found for GR: {searchGr}
        </div>
      )}

      {student && student.id && (
        <div className="space-y-4">
          {/* Student Info */}
          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-900">Student Information</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="font-medium">
                  {student.firstName || student.first_name} {student.lastName || student.last_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">GR Number: </span>
                <span className="font-medium">{student.grNumber || student.gr_number}</span>
              </div>
              <div>
                <span className="text-gray-500">Class: </span>
                <span className="font-medium">
                  {student.currentEnrollment?.className || student.class || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status: </span>
                <StatusBadge status={student.status?.toLowerCase()} />
              </div>
            </div>
            <div className="mt-4">
              <Link
                to={`/slc/issue?gr=${student.grNumber || student.gr_number}`}
                className="btn-primary"
              >
                <FileText className="h-4 w-4" /> Issue New SLC
              </Link>
            </div>
          </div>

          {/* Existing SLCs */}
          {slcs.length > 0 && (
            <div className="card">
              <h2 className="mb-3 font-semibold text-gray-900">Existing SLCs</h2>
              <div className="space-y-2">
                {slcs.map((slc) => (
                  <div key={slc.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div className="text-sm">
                      <span className="font-medium">SLC #{slc.id}</span>
                      <span className="ml-3 text-gray-500">
                        {(slc.issueDate || slc.issue_date)?.split('T')[0]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={slc.status?.toLowerCase()} />
                      <Link to={`/slc/${slc.id}`} className="text-primary-600 hover:underline text-sm">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
