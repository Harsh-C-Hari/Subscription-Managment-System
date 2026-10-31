import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, StatusBadge, Button, Input, Modal, useToast } from '../../components/ui';
import { getTaxes, createTax, updateTax, deleteTax, formatApiError } from '../../api/billing';
import { Plus, RefreshCw, Edit, Trash2, Receipt } from 'lucide-react';

export function TaxesPage() {
  const toast = useToast();

  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [submitting, setSubmitting] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadTaxes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTaxes();
      setTaxes(res.data?.items || res.data || []);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch tax registers'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTaxes();
  }, [loadTaxes]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    setName('');
    setRate('18.00');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tax) => {
    setModalMode('edit');
    setCurrentId(tax.id);
    setName(tax.name);
    setRate(tax.rate);
    setIsActive(tax.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Please enter a jurisdiction or tax name.');
      return;
    }
    if (isNaN(parseFloat(rate)) || parseFloat(rate) < 0) {
      toast.warning('Please enter a valid non-negative tax rate percentage.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        rate: String(parseFloat(rate).toFixed(2)),
        is_active: isActive,
      };

      if (modalMode === 'create') {
        await createTax(payload);
        toast.success(`Tax rate ${payload.name} created successfully.`);
      } else {
        await updateTax(currentId, payload);
        toast.success(`Tax rate ${payload.name} updated.`);
      }

      setIsModalOpen(false);
      await loadTaxes();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save tax record'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tax) => {
    if (!window.confirm(`Are you sure you want to deactivate ${tax.name}?`)) {
      return;
    }
    try {
      await deleteTax(tax.id);
      toast.info(`Tax tier ${tax.name} deactivated.`);
      await loadTaxes();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to deactivate tax rate'));
    }
  };

  const columns = [
    {
      header: 'Tax Description',
      key: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-accent shrink-0" />
          <span className="font-bold text-[#181e22]">{val}</span>
        </div>
      ),
    },
    {
      header: 'Percentage Rate',
      key: 'rate',
      render: (val) => (
        <span className="font-bold font-mono text-sm text-[#181e22]">
          {val}%
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (val) => (
        <StatusBadge status={val ? 'active' : 'inactive'} />
      ),
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
            aria-label="Edit tax"
          >
            <Edit className="w-3.5 h-3.5 text-[#55636c]" />
          </Button>
          {row.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row)}
              className="text-red-600 hover:text-red-700"
              aria-label="Deactivate tax"
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
        bayNumber="BAY 09"
        title="Fiscal Tax Rates"
        subtitle="Administer jurisdiction tax percentages, VAT tiers, and sales tax rules. (Admin Only)"
        status="ADMIN"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="raised"
              size="sm"
              onClick={loadTaxes}
              aria-label="Refresh taxes"
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
              ADD TAX RATE
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={taxes}
        loading={loading}
        page={1}
        pageSize={50}
        total={taxes.length}
        emptyTitle="NO TAX REGISTERS DEFINED"
        emptyDescription="Create your first regional sales tax or VAT rate to enable invoice calculations."
      />

      {/* Create / Edit Tax Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bayNumber="BAY 09-TAX"
        title={modalMode === 'create' ? 'Provision Tax Rate' : 'Update Tax Rate'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs pt-1">
          <Input
            label="Tax Jurisdiction / Name"
            placeholder="e.g. State Sales Tax (GST)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Rate Percentage (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="18.00"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            suffix="%"
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="tax-active-check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-accent focus:ring-accent cursor-pointer"
            />
            <label htmlFor="tax-active-check" className="cursor-pointer font-bold text-[#181e22]">
              Tax Rate is Active & Billable
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
              SAVE TAX TIER
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TaxesPage;
