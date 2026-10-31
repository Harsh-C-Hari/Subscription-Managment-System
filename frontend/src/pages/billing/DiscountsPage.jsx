import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, StatusBadge, Button, Input, Select, Modal, useToast } from '../../components/ui';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount, formatApiError } from '../../api/billing';
import { formatDate, formatMoney } from '../../utils/format';
import { Plus, RefreshCw, Edit, Trash2, Tag, Search } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage (%) Deduction' },
  { value: 'fixed', label: 'Fixed Amount ($) Credit' },
];

export function DiscountsPage() {
  const toast = useToast();

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [submitting, setSubmitting] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('10.00');
  const [minAmount, setMinAmount] = useState('0.00');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;

      const res = await getDiscounts(params);
      setDiscounts(res.data?.items || res.data || []);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch discounts'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, toast]);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    setName('');
    setCode('');
    setType('percentage');
    setValue('10.00');
    setMinAmount('0.00');
    setValidFrom('');
    setValidUntil('');
    setUsageLimit('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d) => {
    setModalMode('edit');
    setCurrentId(d.id);
    setName(d.name);
    setCode(d.code);
    setType(d.type);
    setValue(d.value);
    setMinAmount(d.min_amount || '0.00');
    setValidFrom(d.valid_from ? d.valid_from.split('T')[0] : '');
    setValidUntil(d.valid_until ? d.valid_until.split('T')[0] : '');
    setUsageLimit(d.usage_limit ? String(d.usage_limit) : '');
    setIsActive(d.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.warning('Please specify discount name and promotional code.');
      return;
    }
    if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
      toast.warning('Discount value must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        value: String(parseFloat(value).toFixed(2)),
        min_amount: String(parseFloat(minAmount || '0').toFixed(2)),
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
        is_active: isActive,
      };

      if (modalMode === 'create') {
        await createDiscount(payload);
        toast.success(`Discount code ${payload.code} created.`);
      } else {
        await updateDiscount(currentId, payload);
        toast.success(`Discount code ${payload.code} updated.`);
      }

      setIsModalOpen(false);
      await loadDiscounts();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save discount'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Are you sure you want to deactivate discount ${d.code}?`)) {
      return;
    }
    try {
      await deleteDiscount(d.id);
      toast.info(`Discount code ${d.code} deactivated.`);
      await loadDiscounts();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to deactivate discount'));
    }
  };

  const columns = [
    {
      header: 'Code / Name',
      key: 'code',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-sm text-[#181e22]">{val}</span>
          <span className="text-[11px] text-[#55636c]">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Reduction Value',
      key: 'value',
      render: (val, row) => (
        <span className="font-mono font-bold text-sm text-emerald-700">
          {row.type === 'percentage' ? `${val}%` : formatMoney(val)}
        </span>
      ),
    },
    {
      header: 'Min Threshold',
      key: 'min_amount',
      render: (val) => (
        <span className="text-xs text-[#55636c]">
          {parseFloat(val) > 0 ? formatMoney(val) : 'None ($0)'}
        </span>
      ),
    },
    {
      header: 'Usage Quota',
      key: 'used_count',
      render: (val, row) => (
        <span className="font-mono text-xs text-[#181e22]">
          {val || 0} / {row.usage_limit ? row.usage_limit : '∞'}
        </span>
      ),
    },
    {
      header: 'Validity Period',
      key: 'valid_until',
      render: (val, row) => (
        <span className="text-xs text-[#55636c]">
          {row.valid_from ? formatDate(row.valid_from) : 'Any'} – {val ? formatDate(val) : 'Forever'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      header: 'Actions',
      key: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            aria-label="Edit discount"
          >
            <Edit className="w-3.5 h-3.5 text-[#55636c]" />
          </Button>
          {row.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row)}
              className="text-red-600 hover:text-red-700"
              aria-label="Deactivate discount"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 10"
        title="Promotional Discounts & Codes"
        subtitle="Configure coupons, fixed vouchers, percentage discounts, and redemption usage bounds. (Admin Only)"
        status="ADMIN"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="raised"
              size="sm"
              onClick={loadDiscounts}
              aria-label="Refresh discounts"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="accent"
              size="sm"
              indicator="green"
              onClick={handleOpenCreate}
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-white" />
              CREATE DISCOUNT
            </Button>
          </div>
        }
      />

      {/* Search Input */}
      <div className="p-3 bg-[#cbd0d2] rounded-lg border border-[#9ba5aa] max-w-md">
        <Input
          icon={Search}
          placeholder="Search by code or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={discounts}
        loading={loading}
        page={1}
        pageSize={50}
        total={discounts.length}
        emptyTitle="NO DISCOUNT RECORDS CONFIGURED"
        emptyDescription="Create coupon codes or fixed deduction rules to reward customers."
      />

      {/* Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bayNumber="BAY 10-DISC"
        title={modalMode === 'create' ? 'Create Promotional Discount' : 'Update Promotional Discount'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Promo Code (Uppercase)"
              placeholder="e.g. LAUNCH10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />

            <Input
              label="Campaign Name"
              placeholder="e.g. Q4 Launch Special"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Discount Calculation Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />

            <Input
              label="Discount Value"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="10.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              suffix={type === 'percentage' ? '%' : 'USD'}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Minimum Invoice Amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              suffix="USD"
              hint="Order total eligibility floor"
            />

            <Input
              label="Usage Quota (Max Redemptions)"
              type="number"
              min="1"
              placeholder="Leave blank for infinite"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              hint="Server race-condition protected"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />

            <Input
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="disc-active-check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-accent cursor-pointer"
            />
            <label htmlFor="disc-active-check" className="cursor-pointer font-bold text-[#181e22]">
              Discount is Active & Redeemable
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b6bec2] mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              indicator="green"
              loading={submitting}
            >
              SAVE PROMOTIONAL RULE
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DiscountsPage;
