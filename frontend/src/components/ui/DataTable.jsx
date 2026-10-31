import React from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Industrial Matrix Data Table with Hardware Server Pagination
 */
export function DataTable({
  columns = [],
  data = [],
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  loading = false,
  emptyTitle = 'NO TELEMETRY MATCHES',
  emptyDescription = 'Try adjusting your search criteria or filters.',
  onRowClick,
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startRecord = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="w-full flex flex-col rounded-lg border-2 border-[#9ba5aa] bg-[#d5dbde] p-2 shadow-well">
      {/* Table Housing */}
      <div className="overflow-x-auto rounded border border-[#9aa3a8] bg-[#f4f6f7] shadow-inner relative">
        {loading && (
          <div className="absolute inset-0 bg-[#cbd0d2]/70 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Spinner size="md" label="FETCHING MATRIX..." />
          </div>
        )}

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#b6bec2] border-b-2 border-[#8b969c]">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-3 py-2.5 font-mono text-[11px] font-bold text-[#181e22] tracking-wider uppercase whitespace-nowrap ${
                    col.className || ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-[#414b52] rounded-full" />
                    <span>{col.header}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#c2c9cc] text-[#181e22]">
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`group transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-[#e7eaeb]' : 'hover:bg-[#ebf0f2]'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-3 py-3 font-mono text-xs sm:text-sm text-[#181e22] whitespace-nowrap ${
                        col.className || ''
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Hardware Pagination Control Bank */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-2">
        <div className="flex items-center gap-2">
          <span className="led-lamp led-orange" />
          <span className="font-mono text-[11px] text-[#414b52] font-semibold tracking-wider">
            RECORDS {startRecord}–{endRecord} OF {total}
          </span>
          <span className="text-[#9aa3a8] font-mono text-xs">//</span>
          <span className="font-mono text-[11px] text-[#414b52] font-semibold">
            BAY PAGE {page} / {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="raised"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange && onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 mr-1 inline" />
            PREV
          </Button>

          <Button
            variant="raised"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange && onPageChange(page + 1)}
            aria-label="Next page"
          >
            NEXT
            <ChevronRight className="w-4 h-4 ml-1 inline" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;

