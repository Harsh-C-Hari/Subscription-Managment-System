import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Spinner,
  useToast,
} from '../../components/ui';
import { RecordPaymentModal } from '../../components/billing/RecordPaymentModal';
import {
  getInvoice,
  confirmInvoice,
  cancelInvoice,
  formatApiError,
} from '../../api/billing';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInvoice(id);
      setInvoice(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to retrieve invoice details'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      await confirmInvoice(id);
      toast.success('Invoice confirmed and posted to customer ledger.');
      await loadInvoice();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to confirm invoice'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(true);
      await cancelInvoice(id);
      toast.info('Invoice cancelled.');
      await loadInvoice();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to cancel invoice'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="LOADING INVOICE LEDGER..." />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <p className="font-mono text-sm text-[#55636c]">Invoice record not found.</p>
        <Button variant="raised" size="sm" onClick={() => navigate('/invoices')}>
          Return to Invoices
        </Button>
      </div>
    );
  }

  const isConfirmedOrPartial = invoice.status === 'confirmed' || invoice.status === 'partially_paid';
  const canCancel = (invoice.status === 'draft' || invoice.status === 'confirmed') && parseFloat(invoice.amount_paid || '0') === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Action Header - Hidden during print */}
      <div className="print:hidden">
        <PageHeader
          bayNumber="BAY 06-INV"
          title={invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
          subtitle={`Billing Period: ${formatDate(invoice.period_start)} to ${formatDate(invoice.period_end)}`}
          status={invoice.status.toUpperCase()}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/invoices')}
              >
                <ArrowLeft className="w-4 h-4 mr-1 text-[#55636c]" />
                ALL INVOICES
              </Button>

              <Button
                variant="raised"
                size="sm"
                onClick={loadInvoice}
                disabled={actionLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${actionLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                variant="raised"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-3.5 h-3.5 mr-1 text-accent" />
                PRINT STATEMENT
              </Button>

              {invoice.status === 'draft' && (
                <Button
                  variant="accent"
                  size="sm"
                  indicator="green"
                  onClick={handleConfirm}
                  loading={actionLoading}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-white" />
                  CONFIRM INVOICE
                </Button>
              )}

              {isConfirmedOrPartial && (
                <Button
                  variant="accent"
                  size="sm"
                  indicator="green"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1 text-white" />
                  RECORD PAYMENT
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  loading={actionLoading}
                  className="text-red-700 hover:text-red-800"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                  CANCEL INVOICE
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Overdue Banner if applicable */}
      {invoice.is_overdue && invoice.status !== 'paid' && (
        <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg flex items-center justify-between gap-3 text-red-900 print:hidden">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Invoice Overdue Notice</span>
              <span className="font-mono text-xs text-red-800">
                This receivable passed its maturity date on {formatDate(invoice.due_date)}. Balance outstanding: {formatMoney(invoice.outstanding)}.
              </span>
            </div>
          </div>
          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-red-200 rounded border border-red-300">
            ACTION REQUIRED
          </span>
        </div>
      )}

      {/* INVOICE CHASSIS / PRINTABLE STATEMENT CONTAINER */}
      <div className="bg-[#cbd0d2] p-2 rounded-lg border-2 border-[#9ba5aa] print:p-0 print:border-none print:bg-white print:text-black">
        <div className="bg-[#f4f6f7] p-6 sm:p-8 rounded border border-[#9aa3a8] flex flex-col gap-8 print:p-0 print:border-none print:bg-white">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-[#9ba5aa]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 bg-accent rounded-sm inline-block" />
                <h2 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-[#181e22]">
                  BRIGHTLOOP SYSTEMS
                </h2>
              </div>
              <p className="font-mono text-xs text-[#55636c]">
                Industrial Subscription Telemetry & Billing Ledger
              </p>
              <p className="font-mono text-xs text-[#55636c]">
                VAT / GST Reg: BL-88392019-X
              </p>
            </div>

            <div className="flex flex-col sm:items-end font-mono text-xs">
              <span className="text-[10px] text-[#55636c] uppercase tracking-wider">TAX INVOICE STATEMENT</span>
              <h3 className="text-xl font-bold text-[#181e22]">{invoice.invoice_number}</h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={invoice.status} />
                {invoice.is_overdue && invoice.status !== 'paid' && (
                  <span className="font-bold text-xs text-red-600">[OVERDUE]</span>
                )}
              </div>
            </div>
          </div>

          {/* Account & Billing Cycle Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
            <div>
              <span className="text-[#55636c] block text-[10px] uppercase font-bold mb-1">BILLED TO (CUSTOMER)</span>
              <span className="font-bold text-sm text-[#181e22] block">{invoice.customer?.full_name || '—'}</span>
              <span className="text-[#414b52] block">{invoice.customer?.email}</span>
              {invoice.customer?.company_name && (
                <span className="text-[#414b52] block">{invoice.customer?.company_name}</span>
              )}
            </div>

            <div>
              <span className="text-[#55636c] block text-[10px] uppercase font-bold mb-1">CONTRACT REFERENCE</span>
              <div className="flex items-center gap-2">
                <span className="text-[#55636c]">SUB NUMBER:</span>
                {invoice.subscription_id ? (
                  <Link
                    to={`/subscriptions/${invoice.subscription_id}`}
                    className="font-bold text-[#181e22] hover:text-accent underline"
                  >
                    {invoice.subscription_number || invoice.subscription_id}
                  </Link>
                ) : (
                  <span className="font-bold text-[#181e22]">{invoice.subscription_number || '—'}</span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-[#55636c]">SERVICE PERIOD:</span>
                <span className="block text-[#181e22]">
                  {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[#55636c] block text-[10px] uppercase font-bold mb-1">PAYMENT TIMELINE</span>
              <div className="flex justify-between py-0.5">
                <span className="text-[#55636c]">ISSUE DATE:</span>
                <span className="font-bold text-[#181e22]">{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#55636c]">PAYMENT DUE:</span>
                <span className={`font-bold ${invoice.is_overdue ? 'text-red-600' : 'text-[#181e22]'}`}>
                  {formatDate(invoice.due_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Line Table */}
          <div className="rounded border border-[#9aa3a8] bg-white overflow-hidden shadow-inner">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
                <tr>
                  <th className="py-2.5 px-3 uppercase tracking-wider">Item Allocation</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-center w-24">Quantity</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right w-36">Unit Price</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right w-36">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c2c9cc] text-[#181e22]">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 font-semibold text-[#181e22]">{it.description}</td>
                      <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatMoney(it.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatMoney(it.line_total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#55636c]">
                      No items attached to this invoice statement.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Fiscal Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 font-mono text-xs pt-2">
            <div className="max-w-xs text-[#55636c] text-[11px] leading-relaxed">
              <span className="font-bold text-[#181e22] block mb-1">REMITTANCE INSTRUCTIONS:</span>
              Wire transfers payable to Brightloop Operations Escrow. Reference invoice number{' '}
              <strong className="text-[#181e22]">{invoice.invoice_number}</strong> on all remittances.
            </div>

            <div className="w-full sm:w-80 flex flex-col gap-1.5 p-4 rounded bg-[#e7eaeb] border border-[#9aa3a8]">
              <div className="flex justify-between py-1 text-[#414b52]">
                <span>SUBTOTAL</span>
                <span className="font-semibold text-[#181e22]">{formatMoney(invoice.subtotal)}</span>
              </div>

              {invoice.discount_amount && parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>DISCOUNT APPLIED</span>
                  <span className="font-bold">-{formatMoney(invoice.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 text-[#414b52]">
                <span>TAX ({invoice.tax_rate || '0.00'}%)</span>
                <span className="font-semibold text-[#181e22]">{formatMoney(invoice.tax_amount)}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-[#9ba5aa] font-bold text-base text-[#181e22]">
                <span>TOTAL INVOICED</span>
                <span>{formatMoney(invoice.total)}</span>
              </div>

              <div className="flex justify-between py-1 text-[#55636c] border-t border-[#c2c9cc]">
                <span>AMOUNT PAID</span>
                <span className="font-semibold text-emerald-700">{formatMoney(invoice.amount_paid)}</span>
              </div>

              <div className="flex justify-between py-1 font-bold text-sm bg-white p-2 rounded border border-[#9aa3a8]">
                <span className="text-[#181e22]">BALANCE OUTSTANDING</span>
                <span className={parseFloat(invoice.outstanding) > 0 ? 'text-[#f15b22]' : 'text-emerald-700'}>
                  {formatMoney(invoice.outstanding)}
                </span>
              </div>
            </div>
          </div>

          {/* Recorded Payments History */}
          <div className="mt-4 pt-6 border-t-2 border-[#9ba5aa]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <h4 className="font-mono text-xs font-bold text-[#181e22] uppercase tracking-wider">
                  Settlement History & Receipts ({invoice.payments?.length || 0})
                </h4>
              </div>
            </div>

            <div className="rounded border border-[#9aa3a8] bg-white overflow-hidden shadow-inner">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
                  <tr>
                    <th className="py-2 px-3 uppercase tracking-wider">Payment Reference</th>
                    <th className="py-2 px-3 uppercase tracking-wider">Method</th>
                    <th className="py-2 px-3 uppercase tracking-wider">Recorded Date</th>
                    <th className="py-2 px-3 uppercase tracking-wider text-right">Settled Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c2c9cc] text-[#181e22]">
                  {invoice.payments && invoice.payments.length > 0 ? (
                    invoice.payments.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td className="py-2 px-3">
                          <span className="font-bold text-[#181e22]">{p.reference || p.id}</span>
                          {p.notes && <span className="text-[10px] text-[#55636c] block">{p.notes}</span>}
                        </td>
                        <td className="py-2 px-3 uppercase">{p.method}</td>
                        <td className="py-2 px-3 text-[#55636c]">{formatDateTime(p.paid_at)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {formatMoney(p.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#55636c]">
                        No settlements recorded yet for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        invoice={invoice}
        onSuccess={loadInvoice}
      />
    </div>
  );
}

export default InvoiceDetail;
