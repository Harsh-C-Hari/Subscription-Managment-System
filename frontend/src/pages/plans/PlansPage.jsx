import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/format';
import {
  PageHeader,
  DataTable,
  Button,
  Input,
  Select,
  Modal,
  StatusBadge,
  useToast,
} from '../../components/ui';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
} from 'lucide-react';

export function PlansPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  const [plans, setPlans] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [billingPeriodFilter, setBillingPeriodFilter] = useState('');
  const [productIdFilter, setProductIdFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    billing_period: 'monthly',
    price: '',
    duration_periods: '',
    auto_close: true,
    product_id: '',
  });

  // Load products for dropdown selector
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.get('/products', { params: { page_size: 100 } });
        setProductsList(res.data?.items || []);
      } catch (err) {
        console.warn('Could not load products for plan selector', err);
      }
    }
    loadProducts();
  }, []);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (billingPeriodFilter) params.billing_period = billingPeriodFilter;
      if (productIdFilter) params.product_id = productIdFilter;
      if (isActiveFilter !== '') params.is_active = isActiveFilter;

      const res = await api.get('/plans', { params });
      setPlans(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, billingPeriodFilter, productIdFilter, isActiveFilter, toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      billing_period: 'monthly',
      price: '0.00',
      duration_periods: '12',
      auto_close: true,
      product_id: productsList[0]?.id || '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      billing_period: plan.billing_period,
      price: plan.price,
      duration_periods: plan.duration_periods || '',
      auto_close: !!plan.auto_close,
      product_id: plan.product_id || '',
    });
    setModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        billing_period: formData.billing_period,
        price: parseFloat(formData.price || 0).toFixed(2),
        duration_periods: formData.duration_periods ? parseInt(formData.duration_periods, 10) : null,
        auto_close: !!formData.auto_close,
        product_id: formData.product_id || null,
      };

      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
        toast.success(`Plan "${formData.name}" updated`);
      } else {
        await api.post('/plans', payload);
        toast.success(`Plan "${formData.name}" configured`);
      }

      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save plan');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Deactivate billing plan "${plan.name}"?`)) return;
    try {
      await api.delete(`/plans/${plan.id}`);
      toast.success(`Plan "${plan.name}" deactivated`);
      fetchPlans();
    } catch (err) {
      toast.error('Failed to deactivate plan');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'PLAN IDENTIFIER',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#181e22]">{row.name}</span>
          <span className="text-[11px] text-[#55636c] truncate max-w-xs">{row.description}</span>
        </div>
      ),
    },
    {
      key: 'billing_period',
      header: 'CYCLE FREQUENCY',
      render: (val) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs uppercase font-bold text-[#414b52] bg-[#cbd0d2] px-2 py-0.5 rounded border border-[#9aa3a8]">
          <Clock className="w-3 h-3 text-accent" />
          {val}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'RATE / CYCLE',
      render: (val) => (
        <span className="font-bold text-[#181e22] bg-[#d5dbde] px-2 py-0.5 rounded border border-[#9aa3a8]">
          {formatMoney(val)}
        </span>
      ),
    },
    {
      key: 'duration_periods',
      header: 'DURATION',
      render: (val, row) => (
        <span className="font-mono text-xs text-[#55636c]">
          {val ? `${val} Cycles` : 'Indefinite'}{' '}
          {row.auto_close ? '(Auto-close)' : ''}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'STATUS',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'CONTROLS',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <Button
                variant="raised"
                size="sm"
                onClick={() => handleOpenEdit(row)}
                className="text-[11px] py-0.5 px-2"
                aria-label="Edit plan"
              >
                <Edit2 className="w-3 h-3 text-[#55636c]" />
              </Button>
              {row.is_active && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeletePlan(row)}
                  className="text-[11px] py-0.5 px-2"
                  aria-label="Deactivate plan"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 03"
        title="Subscription Plans Deck"
        subtitle="Configure billing periods, recurring fee schedules, and automatic lifecycle closure triggers."
        status="BILLING MATRIX READY"
        actions={
          isAdmin && (
            <Button
              variant="accent"
              indicator="green"
              onClick={handleOpenCreate}
              className="text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1" />
              CONFIGURE NEW PLAN
            </Button>
          )
        }
      />

      {/* Filter Toolbar */}
      <div className="panel-well rounded-lg p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 border-2 border-[#9ba5aa]">
        <div>
          <Input
            placeholder="Search plan by identifier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={Search}
          />
        </div>

        <div>
          <Select
            value={billingPeriodFilter}
            onChange={(e) => {
              setBillingPeriodFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ALL PERIODS</option>
            <option value="daily">DAILY</option>
            <option value="weekly">WEEKLY</option>
            <option value="monthly">MONTHLY</option>
            <option value="yearly">YEARLY</option>
          </Select>
        </div>

        <div>
          <Select
            value={productIdFilter}
            onChange={(e) => {
              setProductIdFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ALL PRODUCTS</option>
            {productsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ALL STATUSES</option>
            <option value="true">ACTIVE ONLY</option>
            <option value="false">INACTIVE ONLY</option>
          </Select>
        </div>
      </div>

      {/* Plans Matrix */}
      <DataTable
        columns={columns}
        data={plans}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="NO BILLING PLANS DEFINED"
        emptyDescription="Create a plan to start offering automated subscription cycles."
      />

      {/* Create / Edit Plan Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? 'Reconfigure Billing Plan' : 'Define Billing Plan'}
        bayNumber="BAY CFG // PLANS"
      >
        <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
          <Input
            label="PLAN IDENTIFIER NAME *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. CRM Standard Operations (Monthly)"
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="BILLING PERIOD *"
              value={formData.billing_period}
              onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>

            <Input
              label="RECURRING RATE *"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="999.00"
              suffix="USD"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CYCLE DURATION (PERIODS)"
              type="number"
              value={formData.duration_periods}
              onChange={(e) => setFormData({ ...formData, duration_periods: e.target.value })}
              placeholder="e.g. 12 (leave blank for unlimited)"
              hint="Blank = Indefinite"
            />

            <Select
              label="ATTACHED HARDWARE PRODUCT"
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            >
              <option value="">(None / General Plan)</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[#e7eaeb] rounded border border-[#9aa3a8]">
            <input
              type="checkbox"
              id="auto_close"
              checked={formData.auto_close}
              onChange={(e) => setFormData({ ...formData, auto_close: e.target.checked })}
              className="w-4 h-4 accent-accent rounded cursor-pointer"
            />
            <label htmlFor="auto_close" className="font-mono text-xs text-[#181e22] cursor-pointer">
              AUTO-CLOSE SUBSCRIPTION AFTER FINAL DURATION CYCLE
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="engraved-label">PLAN TERMS / DESCRIPTION</label>
            <textarea
              className="w-full bg-[#f4f6f7] text-[#181e22] font-mono text-sm p-3 rounded-key border border-[#9aa3a8] shadow-well focus:bg-white focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specify billing anchor rules, cancellation terms, etc."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#b6bec2]">
            <Button variant="raised" onClick={() => setModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              indicator="orange"
              loading={formSubmitting}
            >
              {editingPlan ? 'UPDATE PLAN' : 'COMMIT PLAN'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PlansPage;
