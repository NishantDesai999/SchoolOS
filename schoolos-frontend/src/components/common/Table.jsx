import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Generic table component.
 *
 * @param {Object[]} columns - [{ key, header, render? }]
 * @param {Object[]} data - rows
 * @param {boolean} loading
 * @param {Object} pagination - { page, size, total } or null
 * @param {Function} onPageChange - (newPage) => void
 */
export default function Table({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  rowKey = 'id',
}) {
  const { t } = useTranslation('common')

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                    {t('table.loading')}
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-sm text-gray-500">
                  {t('table.no_data')}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row[rowKey]} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.size && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-700">
            {t('table.showing', {
              from: pagination.page * pagination.size + 1,
              to: Math.min((pagination.page + 1) * pagination.size, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 0}
              className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={(pagination.page + 1) * pagination.size >= pagination.total}
              className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
