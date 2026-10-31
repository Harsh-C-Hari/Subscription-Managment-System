import React, { useState } from 'react';
import { Modal, Button, Input, useToast } from '../ui';
import { runBilling, formatApiError } from '../../api/billing';
import { Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export function RunBillingModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);

  const handleRun = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setResult(null);
      const res = await runBilling(asOfDate);
      setResult(res.data);
      toast.success(`Billing run completed: ${res.data.created} invoices created.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(formatApiError(err, 'Bulk billing execution failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      bayNumber="BAY 06-RUN"
      title="Automated Bulk Billing Execution"
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {!result ? (
          <form onSubmit={handleRun} className="flex flex-col gap-4">
            <p className="font-mono text-xs text-[#414b52] leading-relaxed">
              This routine sweeps all active subscriptions with next billing dates on or before the selected anchor date, generates invoices in an isolated atomic transaction per subscription, and advances their next renewal period.
            </p>

            <Input
              label="Evaluation Anchor Date"
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              hint="Defaults to current system date"
              required
            />

            <div className="p-3 bg-[#fef3c7] border border-[#f59e0b]/60 rounded font-mono text-xs text-[#92400e] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Duplicate invoice generation within the same period is strictly blocked by the unique sequence ledger constraint.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b6bec2]">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                ABORT
              </Button>
              <Button
                type="submit"
                variant="accent"
                size="sm"
                indicator="orange"
                loading={loading}
              >
                <Play className="w-3.5 h-3.5 mr-1 text-white fill-current" />
                EXECUTE BILLING RUN
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block text-sm">Execution Batch Completed</span>
                <span className="text-[11px] text-emerald-700">Anchor Date: {result.as_of_date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-[#f4f6f7] border border-[#9aa3a8] rounded text-center">
                <span className="text-[10px] text-[#55636c] block uppercase">Created</span>
                <span className="font-bold text-lg text-emerald-700">{result.created}</span>
              </div>
              <div className="p-3 bg-[#f4f6f7] border border-[#9aa3a8] rounded text-center">
                <span className="text-[10px] text-[#55636c] block uppercase">Duplicate Skipped</span>
                <span className="font-bold text-lg text-[#55636c]">{result.skipped_duplicate}</span>
              </div>
              <div className="p-3 bg-[#f4f6f7] border border-[#9aa3a8] rounded text-center">
                <span className="text-[10px] text-[#55636c] block uppercase">Not Due Skipped</span>
                <span className="font-bold text-lg text-[#55636c]">{result.skipped_not_due}</span>
              </div>
              <div className="p-3 bg-[#f4f6f7] border border-[#9aa3a8] rounded text-center">
                <span className="text-[10px] text-[#55636c] block uppercase">Failed</span>
                <span className="font-bold text-lg text-red-600">{result.failed}</span>
              </div>
            </div>

            {result.invoices && result.invoices.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="font-bold text-[#181e22] text-[11px] uppercase tracking-wider">
                  Generated Invoices ({result.invoices.length})
                </span>
                <div className="max-h-36 overflow-y-auto rounded border border-[#9aa3a8] bg-[#f4f6f7] p-2 divide-y divide-[#c2c9cc]">
                  {result.invoices.map((inv, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between items-center text-xs">
                      <span className="font-bold text-[#181e22]">{inv.invoice_number}</span>
                      <span className="text-[#55636c] text-[10px]">SUB ID: {inv.subscription_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b6bec2]">
              <Button variant="raised" size="sm" onClick={handleReset}>
                CLOSE TELEMETRY
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default RunBillingModal;
