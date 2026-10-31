import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, StatusBadge, Button, Modal, useToast } from '../../components/ui';
import { getInvoices, getInvoice, formatApiError } from '../../api/billing';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import { RefreshCw, FileText, Printer, Eye, AlertCircle } from 'lucide-react';

export function MyInvoices() {
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Detail Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInvoices({ page, page_size: pageSize });
      const items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      setInvoices(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch customer invoices'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleOpenDetail = async (inv) => {
    try {
      setModalLoading(true);
      const res = await getInvoice(inv.id);
      setSelectedInvoice(res.data);
    } catch {
      // Fallback to row data if detail endpoint fails
      setSelectedInvoice(inv);
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoice_number',
      render: (val, row) => (
        <span className="font-bold text-[#181e22] group-hover:text-accent transition-colors">
          {val || row.id}
        </span>
      ),
    },
    {
      header: 'Issue Date',
      key: 'issue_date',
      render: (val) => (
        <span className="font-mono text-xs text-[#55636c]">{formatDate(val)}</span>
      ),
    },
    {
      header: 'Due Date',
      key: 'due_date',
      render: (val, row) => (
        <span className={`font-mono text-xs ${row.is_overdue ? 'text-red-600 font-bold' : 'text-[#55636c]'}`}>
          {formatDate(val)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={val} />
          {row.is_overdue && val !== 'paid' && (
            <span className="text-[10px] font-mono font-bold text-red-600">OVERDUE</span>
          )}
        </div>
      ),
    },
    {
      header: 'Total',
      key: 'total',
      className: 'text-right',
      render: (val) => (
        <span className="font-bold text-[#181e22]">{formatMoney(val)}</span>
      ),
    },
    {
      header: 'Outstanding',
      key: 'outstanding',
      className: 'text-right',
      render: (val) => (
        <span className={`font-mono font-bold ${parseFloat(val) > 0 ? 'text-[#f15b22]' : 'text-emerald-700'}`}>
          {formatMoney(val)}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'id',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetail(row);
          }}
          className="text-xs"
        >
          <Eye className="w-3.5 h-3.5 mr-1 text-accent" />
          STATEMENT
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="PORTAL 03"
        title="My Statements & Invoices"
        subtitle="Itemized billing statements, tax breakdowns, and outstanding balance status."
        status="CONNECTED"
        actions={
          <Button
            variant="raised"
            size="sm"
            onClick={loadInvoices}
            aria-label="Refresh invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onRowClick={(row) => handleOpenDetail(row)}
        emptyTitle="NO INVOICES ISSUED"
        emptyDescription="There are currently no billing statements generated for your account."
      />

      {/* Invoice Detail / Printable Modal */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        bayNumber="PORTAL 03-STMT"
        title={`Statement ${selectedInvoice?.invoice_number || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedInvoice && (
          <div className="flex flex-col gap-6 font-mono text-xs pt-1">
            {/* Header info strip */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 bg-[#e7eaeb] rounded border border-[#9aa3a8]">
              <div>
                <span className="text-[10px] text-[#55636c] block uppercase">Billing Period</span>
                <span className="font-bold text-[#181e22]">
                  {formatDate(selectedInvoice.period_start)} to {formatDate(selectedInvoice.period_end)}
                </span>
                <span className="text-[#55636c] block mt-1">
                  Issued: {formatDate(selectedInvoice.issue_date)} // Due: {formatDate(selectedInvoice.due_date)}
                </span>
              </div>

              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-[#55636c] block uppercase">Statement Status</span>
                <StatusBadge status={selectedInvoice.status} />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <span className="font-bold text-[#181e22] block mb-2 uppercase tracking-wider text-[11px]">
                Itemized Service Allocations
              </span>
              <div className="rounded border border-[#9aa3a8] bg-white overflow-hidden shadow-inner">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
                    <tr>
                      <th className="py-2 px-3 uppercase">Description</th>
                      <th className="py-2 px-3 uppercase text-center w-20">Qty</th>
                      <th className="py-2 px-3 uppercase text-right w-28">Unit Price</th>
                      <th className="py-2 px-3 uppercase text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c2c9cc]">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2 px-3 font-semibold text-[#181e22]">{it.description}</td>
                          <td className="py-2 px-3 text-center">{it.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatMoney(it.unit_price)}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#181e22]">{formatMoney(it.line_total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#55636c]">
                          No item records attached.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Calculation */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 flex flex-col gap-1 p-3 rounded bg-[#f4f6f7] border border-[#9aa3a8]">
                <div className="flex justify-between text-[#414b52]">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-[#181e22]">{formatMoney(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount_amount && parseFloat(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-bold">-{formatMoney(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#414b52]">
                  <span>Tax ({selectedInvoice.tax_rate || '0.00'}%):</span>
                  <span>{formatMoney(selectedInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#181e22] pt-1 border-t border-[#9ba5aa]">
                  <span>Total Invoiced:</span>
                  <span>{formatMoney(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs bg-white p-1.5 rounded border border-[#9aa3a8] mt-1">
                  <span className="text-[#181e22]">Amount Due:</span>
                  <span className={parseFloat(selectedInvoice.outstanding) > 0 ? 'text-[#f15b22]' : 'text-emerald-700'}>
                    {formatMoney(selectedInvoice.outstanding)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment history */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div>
                <span className="font-bold text-[#181e22] block mb-2 uppercase tracking-wider text-[11px]">
                  Applied Receipts & Remittances
                </span>
                <div className="rounded border border-[#9aa3a8] bg-white p-2 divide-y divide-[#c2c9cc]">
                  {selectedInvoice.payments.map((p, idx) => (
                    <div key={p.id || idx} className="py-1.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#181e22]">{p.reference || p.id}</span>
                        <span className="text-[#55636c] text-[10px] block">{formatDateTime(p.paid_at)} // {p.method}</span>
                      </div>
                      <span className="font-bold text-emerald-700">{formatMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#b6bec2]">
              <Button
                variant="raised"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="w-3.5 h-3.5 mr-1 text-accent" />
                PRINT STATEMENT
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>
                CLOSE
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyInvoices;
