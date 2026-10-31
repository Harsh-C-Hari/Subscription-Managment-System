import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, DataTable, Button, Input, Select, Modal, useToast } from '../../components/ui';
import { SubscriptionItemsEditor } from '../../components/billing/SubscriptionItemsEditor';
import {
  getQuotationTemplates,
  createQuotationTemplate,
  updateQuotationTemplate,
  deleteQuotationTemplate,
  getPlans,
  getProducts,
  formatApiError,
} from '../../api/billing';
import { formatMoney } from '../../utils/format';
import { Plus, RefreshCw, Edit, Trash2, FileSpreadsheet, Send, ArrowRight } from 'lucide-react';

export function QuotationTemplates() {
  const navigate = useNavigate();
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [planId, setPlanId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [items, setItems] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tmplRes, planRes, prodRes] = await Promise.all([
        getQuotationTemplates(),
        getPlans({ page_size: 100 }),
        getProducts({ page_size: 100 }),
      ]);

      setTemplates(tmplRes.data?.items || tmplRes.data || []);
      setPlans(planRes.data?.items || planRes.data || []);
      setProducts(prodRes.data?.items || prodRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch quotation templates'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    setName('');
    setDescription('');
    setPlanId(plans[0]?.id || '');
    setValidityDays(30);
    setItems(
      products.length > 0
        ? [
            {
              product_id: products[0].id,
              variant_id: null,
              description: products[0].name,
              quantity: 1,
              unit_price: products[0].base_price || '99.00',
            },
          ]
        : []
    );
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl) => {
    setModalMode('edit');
    setCurrentId(tmpl.id);
    setName(tmpl.name);
    setDescription(tmpl.description || '');
    setPlanId(tmpl.plan_id || '');
    setValidityDays(tmpl.validity_days || 30);
    setItems(
      (tmpl.items || []).map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }))
    );
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Please provide a quotation template title.');
      return;
    }
    if (items.length === 0) {
      toast.warning('Please add at least one line item to the quotation template.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        plan_id: planId || null,
        validity_days: parseInt(validityDays, 10) || 30,
        items: items.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          description: it.description,
          quantity: parseInt(it.quantity, 10) || 1,
          unit_price: String(it.unit_price),
        })),
      };

      if (modalMode === 'create') {
        await createQuotationTemplate(payload);
        toast.success(`Quotation template ${payload.name} created.`);
      } else {
        await updateQuotationTemplate(currentId, payload);
        toast.success(`Quotation template ${payload.name} updated.`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to save quotation template'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Are you sure you want to delete template ${tmpl.name}?`)) {
      return;
    }
    try {
      await deleteQuotationTemplate(tmpl.id);
      toast.info(`Quotation template ${tmpl.name} deleted.`);
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to delete template'));
    }
  };

  const columns = [
    {
      header: 'Template Title',
      key: 'name',
      render: (val, row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-accent shrink-0" />
            <span className="font-bold text-[#181e22]">{val}</span>
          </div>
          {row.description && (
            <span className="text-[11px] text-[#55636c] pl-6">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Linked Plan',
      key: 'plan_id',
      render: (val) => {
        const p = plans.find((pl) => pl.id === val);
        return <span className="font-medium text-[#414b52]">{p?.name || '—'}</span>;
      },
    },
    {
      header: 'Validity (Days)',
      key: 'validity_days',
      render: (val) => <span className="font-mono text-xs">{val || 30} DAYS</span>,
    },
    {
      header: 'Allocated Items',
      key: 'items',
      render: (val) => {
        const count = val?.length || 0;
        const total = (val || []).reduce((acc, it) => acc + (parseFloat(it.unit_price) * it.quantity || 0), 0);
        return (
          <div className="flex flex-col">
            <span className="font-mono font-bold text-[#181e22]">{formatMoney(total.toFixed(2))}</span>
            <span className="text-[10px] text-[#55636c]">{count} item(s) configured</span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'id',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="raised"
            size="sm"
            onClick={() => navigate(`/subscriptions/new?template_id=${row.id}`)}
            className="text-[11px] px-2 py-0.5"
            title="Use template in new subscription"
          >
            USE
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            aria-label="Edit template"
          >
            <Edit className="w-3.5 h-3.5 text-[#55636c]" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            aria-label="Delete template"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 08"
        title="Quotation Templates"
        subtitle="Manage standardized service quotations, recurring bundles, and pre-engineered line item sets."
        status="ONLINE"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="raised"
              size="sm"
              onClick={loadData}
              aria-label="Refresh templates"
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
              CREATE TEMPLATE
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        page={1}
        pageSize={50}
        total={templates.length}
        emptyTitle="NO QUOTATION TEMPLATES FOUND"
        emptyDescription="Create your first reusable quotation preset to accelerate customer provisioning."
      />

      {/* Create / Edit Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bayNumber="BAY 08-TMPL"
        title={modalMode === 'create' ? 'Assemble Quotation Preset' : 'Update Quotation Preset'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="sm:col-span-2">
              <Input
                label="Template Name"
                placeholder="e.g. Standard Edge Node Fleet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Validity Span (Days)"
                type="number"
                min="1"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                suffix="DAYS"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Template Scope / Remarks"
                placeholder="Detailed technical description of included services..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <Select
                label="Linked Plan Tier"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">-- No Linked Plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Line items editor */}
          <div className="pt-2 border-t border-[#b6bec2]">
            <SubscriptionItemsEditor
              items={items}
              onChange={setItems}
              products={products}
              readOnly={false}
            />
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
              SAVE TEMPLATE
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default QuotationTemplates;
