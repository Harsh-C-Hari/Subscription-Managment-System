import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  Card,
  StatusBadge,
  Button,
  Spinner,
  Modal,
  Input,
  useToast,
} from '../../components/ui';
import {
  getSubscription,
  sendQuotation,
  confirmSubscription,
  activateSubscription,
  pauseSubscription,
  resumeSubscription,
  closeSubscription,
  renewSubscription,
  generateInvoice,
  formatApiError,
} from '../../api/billing';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import {
  ArrowLeft,
  RefreshCw,
  Send,
  CheckCircle,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  FileText,
  User,
  Calendar,
  Layers,
  Receipt,
  Tag,
} from 'lucide-react';

export function SubscriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Activation Modal State
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activationStartDate, setActivationStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSubscription(id);
      setSubscription(res.data);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to retrieve subscription details'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Lifecycle Action Handlers
  const handleSendQuotation = async () => {
    try {
      setActionLoading(true);
      await sendQuotation(id);
      toast.success('Quotation dispatched to customer.');
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to send quotation'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      await confirmSubscription(id);
      toast.success('Subscription contract confirmed.');
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to confirm subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      setActionLoading(true);
      await activateSubscription(id, { start_date: activationStartDate });
      toast.success('Subscription activated and billing cycle initialized.');
      setShowActivateModal(false);
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to activate subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      await pauseSubscription(id);
      toast.warning('Subscription paused.');
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to pause subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      await resumeSubscription(id);
      toast.success('Subscription resumed.');
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to resume subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close and terminate this subscription contract?')) {
      return;
    }
    try {
      setActionLoading(true);
      await closeSubscription(id);
      toast.info('Subscription contract closed.');
      await loadSubscription();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to close subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    try {
      setActionLoading(true);
      const res = await renewSubscription(id);
      toast.success('New draft renewal subscription created.');
      const newId = res.data?.id;
      if (newId) {
        navigate(`/subscriptions/${newId}`);
      } else {
        await loadSubscription();
      }
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to renew subscription'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setActionLoading(true);
      const res = await generateInvoice(id);
      toast.success(`Invoice ${res.data.invoice_number} generated successfully in draft status.`);
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to generate invoice'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="LOADING SUBSCRIPTION TELEMETRY..." />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <p className="font-mono text-sm text-[#55636c]">Subscription record not found.</p>
        <Button variant="raised" size="sm" onClick={() => navigate('/subscriptions')}>
          Return to Matrix
        </Button>
      </div>
    );
  }

  const status = subscription.status;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 05-DET"
        title={subscription.subscription_number || `SUB-${subscription.id.slice(0, 8)}`}
        subtitle={`Current Lifecycle: ${status.toUpperCase()} // Customer: ${subscription.customer?.full_name || 'N/A'}`}
        status={status.toUpperCase()}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/subscriptions')}
            >
              <ArrowLeft className="w-4 h-4 mr-1 text-[#55636c]" />
              ALL SUBSCRIPTIONS
            </Button>

            <Button
              variant="raised"
              size="sm"
              onClick={loadSubscription}
              disabled={actionLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${actionLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* LIFECYCLE ACTION BUTTONS SHOWN ONLY FOR VALID TRANSITIONS */}
            {status === 'draft' && (
              <>
                <Button
                  variant="raised"
                  size="sm"
                  indicator="amber"
                  onClick={handleSendQuotation}
                  loading={actionLoading}
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-[#f59e0b]" />
                  SEND QUOTATION
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  indicator="green"
                  onClick={handleConfirm}
                  loading={actionLoading}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-white" />
                  CONFIRM CONTRACT
                </Button>
              </>
            )}

            {status === 'quotation' && (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  indicator="green"
                  onClick={handleConfirm}
                  loading={actionLoading}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-white" />
                  CONFIRM CONTRACT
                </Button>
              </>
            )}

            {status === 'confirmed' && (
              <Button
                variant="accent"
                size="sm"
                indicator="green"
                onClick={() => setShowActivateModal(true)}
                loading={actionLoading}
              >
                <Play className="w-3.5 h-3.5 mr-1 text-white fill-current" />
                ACTIVATE SUBSCRIPTION
              </Button>
            )}

            {status === 'active' && (
              <>
                <Button
                  variant="raised"
                  size="sm"
                  indicator="orange"
                  onClick={handleGenerateInvoice}
                  loading={actionLoading}
                >
                  <FileText className="w-3.5 h-3.5 mr-1 text-accent" />
                  GENERATE INVOICE
                </Button>

                <Button
                  variant="raised"
                  size="sm"
                  indicator="amber"
                  onClick={handlePause}
                  loading={actionLoading}
                >
                  <Pause className="w-3.5 h-3.5 mr-1 text-amber-500 fill-current" />
                  PAUSE
                </Button>
              </>
            )}

            {status === 'paused' && (
              <Button
                variant="accent"
                size="sm"
                indicator="green"
                onClick={handleResume}
                loading={actionLoading}
              >
                <Play className="w-3.5 h-3.5 mr-1 text-white fill-current" />
                RESUME
              </Button>
            )}

            {(status === 'draft' || status === 'quotation' || status === 'confirmed' || status === 'active' || status === 'paused') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                loading={actionLoading}
                className="text-red-700 hover:text-red-800"
              >
                <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                CLOSE
              </Button>
            )}

            {(status === 'closed' || status === 'active') && (
              <Button
                variant="raised"
                size="sm"
                onClick={handleRenew}
                loading={actionLoading}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-accent" />
                RENEW
              </Button>
            )}
          </div>
        }
      />

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information Panel */}
        <Card
          bayNumber="MOD 01"
          title="Account Specification"
          subtitle="Subscriber account profile."
          variant="chassis"
        >
          <div className="flex flex-col gap-3 font-mono text-xs pt-1">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span className="font-bold text-sm text-[#181e22]">
                {subscription.customer?.full_name || 'Customer Profile'}
              </span>
            </div>
            <div className="divide-y divide-[#c2c9cc] text-[#414b52]">
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">EMAIL</span>
                <span className="text-[#181e22] font-semibold">{subscription.customer?.email || '—'}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">ACCOUNT ID</span>
                <span className="text-[#181e22]">{subscription.customer?.id?.slice(0, 12)}...</span>
              </div>
              {subscription.notes && (
                <div className="py-1.5 flex flex-col gap-1">
                  <span className="text-[#55636c]">REMARKS</span>
                  <span className="text-[#181e22] italic">{subscription.notes}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Plan & Cycle Specification */}
        <Card
          bayNumber="MOD 02"
          title="Recurring Schedule"
          subtitle="Plan configuration and anchor timeline."
          variant="chassis"
        >
          <div className="flex flex-col gap-3 font-mono text-xs pt-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span className="font-bold text-sm text-[#181e22]">
                {subscription.plan?.name || 'Base Plan'}
              </span>
            </div>
            <div className="divide-y divide-[#c2c9cc] text-[#414b52]">
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">CYCLE PERIOD</span>
                <span className="text-[#181e22] font-bold uppercase">
                  {subscription.plan?.billing_period || 'MONTHLY'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">START DATE</span>
                <span className="text-[#181e22]">{formatDate(subscription.start_date)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">NEXT BILLING</span>
                <span className="text-[#f15b22] font-bold">
                  {formatDate(subscription.next_billing_date)}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#55636c]">END / EXPIRY</span>
                <span className="text-[#181e22]">{formatDate(subscription.end_date)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Fiscal Parameters Card */}
        <Card
          bayNumber="MOD 03"
          title="Fiscal Modifiers"
          subtitle="Taxes and discounts configured."
          variant="chassis"
        >
          <div className="flex flex-col gap-3 font-mono text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[#55636c] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-accent" />
                APPLIED TAX
              </span>
              <span className="font-bold text-[#181e22]">
                {subscription.tax ? `${subscription.tax.name} (${subscription.tax.rate}%)` : 'NONE (0.00%)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#55636c] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-accent" />
                PROMO DISCOUNT
              </span>
              <span className="font-bold text-emerald-700">
                {subscription.discount
                  ? `${subscription.discount.code} (${subscription.discount.type === 'percentage' ? `${subscription.discount.value}%` : `$${subscription.discount.value}`})`
                  : 'NONE'}
              </span>
            </div>

            <div className="pt-2 border-t border-[#c2c9cc] flex justify-between items-center">
              <span className="text-[#55636c]">STATUS BADGE</span>
              <StatusBadge status={status} />
            </div>

            <div className="text-[10px] text-[#55636c] pt-1">
              CREATED AT: {formatDateTime(subscription.created_at)}
            </div>
          </div>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card
        bayNumber="BAY 05-ITEMS"
        title="Provisioned Line Items"
        subtitle="Itemized products and license rates under this contract."
        variant="chassis"
      >
        <div className="rounded border border-[#9aa3a8] bg-[#f4f6f7] overflow-x-auto shadow-well">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
              <tr>
                <th className="py-2.5 px-3 uppercase tracking-wider">Item Description</th>
                <th className="py-2.5 px-3 uppercase tracking-wider text-center w-24">Quantity</th>
                <th className="py-2.5 px-3 uppercase tracking-wider text-right w-36">Unit Price</th>
                <th className="py-2.5 px-3 uppercase tracking-wider text-right w-36">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c2c9cc] text-[#181e22]">
              {subscription.items && subscription.items.length > 0 ? (
                subscription.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#181e22]">{item.description}</span>
                      {item.product_id && (
                        <span className="text-[10px] text-[#55636c] block">ID: {item.product_id}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right">{formatMoney(item.unit_price)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#181e22]">
                      {formatMoney(item.line_total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#55636c]">
                    No line items attached to this subscription.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Activation Modal */}
      <Modal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        bayNumber="BAY 05-ACT"
        title="Activate Subscription Contract"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4 font-mono text-xs">
          <p className="text-[#414b52]">
            Activating this contract establishes the operational service period and sets the next billing cycle anchor.
          </p>

          <Input
            label="Service Start Date"
            type="date"
            value={activationStartDate}
            onChange={(e) => setActivationStartDate(e.target.value)}
            hint="Billing anchor day will derive from this date"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b6bec2]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActivateModal(false)}
              disabled={actionLoading}
            >
              CANCEL
            </Button>
            <Button
              variant="accent"
              size="sm"
              indicator="green"
              onClick={handleActivate}
              loading={actionLoading}
            >
              CONFIRM ACTIVATION
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SubscriptionDetail;
