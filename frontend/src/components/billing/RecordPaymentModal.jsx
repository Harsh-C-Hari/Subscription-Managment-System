import React, { useState } from 'react';
import { Modal, Button, Input, Select, useToast } from '../ui';
import { formatMoney } from '../../utils/format';
import { createPayment, formatApiError } from '../../api/billing';
import { CreditCard, QrCode, Building, Wallet, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit / Debit Card (Gateway Authorization)' },
  { value: 'bank_transfer', label: 'Direct Wire / Bank Settlement' },
  { value: 'upi', label: 'UPI / Immediate Unified Payment' },
  { value: 'cash', label: 'Cash / Manual Counter Settlement' },
  { value: 'other', label: 'Other General Ledger Voucher' },
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

  // Method specific fields
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState(invoice?.customer?.full_name || '');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');

  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('JPMorgan / Escrow');

  // Sync amount when invoice changes
  React.useEffect(() => {
    if (invoice?.outstanding) {
      setAmount(invoice.outstanding);
    }
    if (invoice?.customer?.full_name) {
      setCardHolder(invoice.customer.full_name);
    }
  }, [invoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.warning('Please enter a valid payment amount greater than zero.');
      return;
    }

    let finalRef = reference.trim();
    if (!finalRef) {
      if (method === 'card') {
        finalRef = `GATEWAY-CARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      } else if (method === 'upi') {
        finalRef = `UPI-TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      } else if (method === 'bank_transfer') {
        finalRef = `WIRE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      } else {
        finalRef = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
    }

    let methodNotes = notes.trim();
    if (method === 'card') {
      methodNotes = `Authorized via Payment Gateway Terminal. Card ending in ${cardNumber.slice(-4)}. ${methodNotes}`.trim();
    } else if (method === 'upi' && upiId) {
      methodNotes = `Settled via UPI ID: ${upiId}. ${methodNotes}`.trim();
    } else if (method === 'bank_transfer' && bankName) {
      methodNotes = `Bank: ${bankName}. ${methodNotes}`.trim();
    }

    try {
      setLoading(true);
      await createPayment(invoice.id, {
        amount: String(parseFloat(amount).toFixed(2)),
        method,
        reference: finalRef,
        notes: methodNotes || undefined,
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
      title={`Payment Gateway Settlement — ${invoice.invoice_number}`}
      maxWidth="max-w-xl"
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

        {/* Amount & Method Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <Input
            label="Settlement Amount"
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
            label="Payment Channel / Gateway"
            options={PAYMENT_METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>

        {/* Dynamic Payment Channel Sub-Panel */}
        {method === 'card' && (
          <div className="p-3.5 bg-[#e7eaeb] border border-[#9aa3a8] rounded flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#c2c9cc]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-accent" />
                <span className="font-bold text-[#181e22]">Gateway Card Terminal</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <ShieldCheck className="w-3 h-3" />
                256-BIT ENCRYPTED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Cardholder Name"
                placeholder="Name on card"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
              />

              <Input
                label="Card Number"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Expiry Date"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
              />

              <Input
                label="CVV / Security Code"
                placeholder="CVC"
                type="password"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
              />
            </div>
          </div>
        )}

        {method === 'upi' && (
          <div className="p-3.5 bg-[#e7eaeb] border border-[#9aa3a8] rounded flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#c2c9cc]">
              <QrCode className="w-4 h-4 text-accent" />
              <span className="font-bold text-[#181e22]">Unified Payments Interface (UPI)</span>
            </div>
            <Input
              label="Virtual Payment Address (VPA / UPI ID)"
              placeholder="e.g. customer@okhdfcbank or client@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
        )}

        {method === 'bank_transfer' && (
          <div className="p-3.5 bg-[#e7eaeb] border border-[#9aa3a8] rounded flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-[#c2c9cc]">
              <Building className="w-4 h-4 text-accent" />
              <span className="font-bold text-[#181e22]">Wire Transfer / ACH Verification</span>
            </div>
            <Input
              label="Remitting Bank Institution"
              placeholder="e.g. JPMorgan Chase, Wells Fargo, HSBC"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
        )}

        {/* Reference and Notes */}
        <div className="flex flex-col gap-3 font-mono text-xs">
          <Input
            label="Transaction Authorization / Reference Code"
            placeholder="Leave blank to auto-generate unique gateway code"
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
            <Lock className="w-3.5 h-3.5 mr-1 text-white" />
            AUTHORIZE & SETTLE
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RecordPaymentModal;
