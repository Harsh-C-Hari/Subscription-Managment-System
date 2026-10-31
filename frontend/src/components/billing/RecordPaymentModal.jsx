import React, { useState } from 'react';
import { Modal, Button, Input, Select, useToast } from '../ui';
import { formatMoney } from '../../utils/format';
import { createPayment, formatApiError } from '../../api/billing';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'bank_transfer', label: 'Wire / Bank Transfer' },
  { value: 'upi', label: 'UPI / Immediate Transfer' },
  { value: 'cash', label: 'Cash Settlement' },
  { value: 'other', label: 'Other Ledger Settlement' },
];

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(invoice?.outstanding || '');
  const [method, setMethod] = useState('card');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Sync amount when invoice changes
  React.useEffect(() => {
    if (invoice?.outstanding) {
      setAmount(invoice.outstanding);
    }
  }, [invoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.warning('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setLoading(true);
      await createPayment(invoice.id, {
        amount: String(amount),
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        paid_at: new Date().toISOString(),
      });
      toast.success(`Payment of ${formatMoney(amount)} successfully posted to ${invoice.invoice_number}`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to record payment settlement'));
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      bayNumber="BAY 07-PAY"
      title={`Record Payment — ${invoice.invoice_number}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
        {/* Invoice Summary Strip */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded bg-[#b6bec2]/40 border border-[#9aa3a8] font-mono text-xs">
          <div>
            <span className="text-[#55636c] block text-[10px] uppercase">Invoice Total</span>
            <span className="font-bold text-[#181e22]">{formatMoney(invoice.total)}</span>
          </div>
          <div>
            <span className="text-[#55636c] block text-[10px] uppercase">Already Paid</span>
            <span className="font-semibold text-emerald-700">{formatMoney(invoice.amount_paid)}</span>
          </div>
          <div>
            <span className="text-[#55636c] block text-[10px] uppercase">Outstanding</span>
            <span className="font-bold text-[#f15b22]">{formatMoney(invoice.outstanding)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 font-mono text-xs">
          <Input
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            suffix="USD"
            hint={`Max: ${formatMoney(invoice.outstanding)}`}
            required
          />

          <Select
            label="Settlement Method"
            options={PAYMENT_METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />

          <Input
            label="External Reference / Transaction ID"
            placeholder="e.g. WIRE-88392 or AUTH-99120"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="engraved-label cursor-pointer flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-label/40" />
              Operational Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal accounting or settlement remarks..."
              className="w-full bg-[#f4f6f7] text-[#181e22] font-mono text-xs p-2.5 rounded-key border border-[#9aa3a8] shadow-well focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b6bec2] mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            CANCEL
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            indicator="green"
            loading={loading}
          >
            CONFIRM SETTLEMENT
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RecordPaymentModal;
