import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, FileText, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../../components/common/Modal'
import { feesApi } from '../../api/fees'
import { schoolApi } from '../../api/school'
import Table from '../../components/common/Table'
import StatusBadge from '../../components/common/StatusBadge'

const STATUSES = ['', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED']

export default function InvoiceList() {
  const { t: tc } = useTranslation('common')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [yearId, setYearId] = useState('')
  const [page, setPage] = useState(0)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genYearId, setGenYearId] = useState('')
  const [genPeriod, setGenPeriod] = useState('')
  const [genDueDate, setGenDueDate] = useState('')

  const { data: years } = useQuery({
    queryKey: ['calendar-years'],
    queryFn: () => schoolApi.listCalendarYears(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status, yearId, page],
    queryFn: () => feesApi.listInvoices({
      search,
      status: status || undefined,
      yearId: yearId || undefined,
      page,
      size: 20,
    }),
  })

  const generateMutation = useMutation({
    mutationFn: () => feesApi.generateInvoices({
      calendarYearId: genYearId,
      periodLabel: genPeriod,
      dueDate: genDueDate || null,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      const count = Array.isArray(res) ? res.length : (res?.data?.length ?? 0)
      toast.success(`Generated ${count} invoices`)
      setShowGenerate(false)
      setGenYearId('')
      setGenPeriod('')
      setGenDueDate('')
    },
    onError: (err) => toast.error(err.message),
  })

  const yearList = Array.isArray(years) ? years : years?.data || []

  const columns = [
    {
      key: 'studentName',
      header: 'Student',
      render: (v, row) => v || row.student_name || '—',
    },
    {
      key: 'grNumber',
      header: 'GR',
      render: (v, row) => v || row.gr_number || '—',
    },
    {
      key: 'period',
      header: 'Period',
      render: (v, row) => v || row.yearLabel || row.year_label || '—',
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (v, row) => `₹${Number(v || row.total_amount || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v?.toLowerCase()} />,
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (v) => (
        <span className={Number(v) > 0 ? 'text-red-700 font-medium' : 'text-gray-700'}>
          ₹{Number(v || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (id) => (
        <div className="flex items-center gap-2">
          <Link to={`/fees/invoices/${id}`} className="text-primary-600 hover:underline text-sm">
            View
          </Link>
          <a
            href={feesApi.getInvoicePdfUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </a>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={() => setShowGenerate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Generate Invoices
        </button>
      </div>

      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Invoices">
        <div className="space-y-4">
          <div>
            <label className="label">Academic Year</label>
            <select value={genYearId} onChange={(e) => setGenYearId(e.target.value)} className="input-field">
              <option value="">-- Select Year --</option>
              {yearList.map((yr) => (
                <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Period Label (e.g. "Q1 2025-26")</label>
            <input
              type="text"
              value={genPeriod}
              onChange={(e) => setGenPeriod(e.target.value)}
              placeholder="Q1 2025-26"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Due Date (optional, defaults to 30 days from now)</label>
            <input
              type="date"
              value={genDueDate}
              onChange={(e) => setGenDueDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowGenerate(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={!genYearId || !genPeriod || generateMutation.isPending}
              className="btn-primary"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or GR..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="input-field pl-9"
          />
        </div>
        <select
          value={yearId}
          onChange={(e) => { setYearId(e.target.value); setPage(0) }}
          className="input-field w-40"
        >
          <option value="">All Years</option>
          {yearList.map((yr) => (
            <option key={yr.id} value={yr.id}>{yr.label || yr.year}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0) }}
          className="input-field w-36"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.data || (Array.isArray(data) ? data : [])}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  )
}
