import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, Input, Select, Spinner, useToast } from '../../components/ui';
import { SubscriptionItemsEditor } from '../../components/billing/SubscriptionItemsEditor';
import {
  createSubscription,
  getTaxes,
  getDiscounts,
  getQuotationTemplates,
  getCustomers,
  getPlans,
  getProducts,
  formatApiError,
} from '../../api/billing';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

export function SubscriptionCreate() {
  const navigate = useNavigate();
  const toast = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference datasets
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [taxId, setTaxId] = useState('');
  const [discountId, setDiscountId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function loadFormDatasets() {
      try {
        setInitialLoading(true);
        const [custRes, planRes, prodRes, taxRes, discRes, tmplRes] = await Promise.all([
          getCustomers({ page_size: 100 }),
          getPlans({ page_size: 100 }),
          getProducts({ page_size: 100 }),
          getTaxes({ is_active: true }),
          getDiscounts({ is_active: true }),
          getQuotationTemplates(),
        ]);

        const custList = custRes.data?.items || custRes.data || [];
        const planList = planRes.data?.items || planRes.data || [];
        const prodList = prodRes.data?.items || prodRes.data || [];
        const taxList = taxRes.data?.items || taxRes.data || [];
        const discList = discRes.data?.items || discRes.data || [];
        const tmplList = tmplRes.data?.items || tmplRes.data || [];

        setCustomers(custList);
        setPlans(planList);
        setProducts(prodList);
        setTaxes(taxList);
        setDiscounts(discList);
        setTemplates(tmplList);

        if (custList.length > 0) setCustomerId(custList[0].id);
        if (planList.length > 0) {
          setPlanId(planList[0].id);
          // Prepopulate an item from the first plan
          const p = planList[0];
          setItems([
            {
              product_id: p.product_id || prodList[0]?.id || '',
              variant_id: null,
              description: `${p.name} Provisioning Tier`,
              quantity: 1,
              unit_price: p.price || '99.00',
            },
          ]);
        }
      } catch (err) {
        toast.error(formatApiError(err, 'Failed to fetch catalog telemetry'));
      } finally {
        setInitialLoading(false);
      }
    }

    loadFormDatasets();
  }, [toast]);

  // Handle plan change
  const handlePlanChange = (selectedPlanId) => {
    setPlanId(selectedPlanId);
    const selPlan = plans.find((p) => p.id === selectedPlanId);
    if (selPlan && items.length <= 1) {
      setItems([
        {
          product_id: selPlan.product_id || products[0]?.id || '',
          variant_id: null,
          description: `${selPlan.name} Tier Allocation`,
          quantity: 1,
          unit_price: selPlan.price || '99.00',
        },
      ]);
    }
  };

  // Handle template selection
  const handleTemplateChange = (selectedTmplId) => {
    setTemplateId(selectedTmplId);
    if (!selectedTmplId) return;

    const tmpl = templates.find((t) => t.id === selectedTmplId);
    if (tmpl) {
      if (tmpl.plan_id) setPlanId(tmpl.plan_id);
      if (tmpl.items && tmpl.items.length > 0) {
        setItems(
          tmpl.items.map((it) => ({
            product_id: it.product_id,
            variant_id: it.variant_id || null,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
          }))
        );
      }
      toast.info(`Preloaded ${tmpl.items?.length || 0} line items from ${tmpl.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerId) {
      toast.warning('Please select a target customer account.');
      return;
    }
    if (!planId) {
      toast.warning('Please select a base billing plan.');
      return;
    }

    // Prepare payload per contract §10
    const payload = {
      customer_id: customerId,
      plan_id: planId,
      template_id: templateId || null,
      tax_id: taxId || null,
      discount_id: discountId || null,
      notes: notes.trim(),
      items: items.map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id || null,
        description: it.description,
        quantity: parseInt(it.quantity, 10) || 1,
        unit_price: String(it.unit_price),
      })),
    };

    // Attach human names for mock state if needed
    const selCust = customers.find((c) => c.id === customerId);
    const selPlan = plans.find((p) => p.id === planId);
    if (selCust) {
      payload.customer_name = selCust.full_name || selCust.company_name;
      payload.customer_email = selCust.email;
    }
    if (selPlan) {
      payload.plan_name = selPlan.name;
      payload.billing_period = selPlan.billing_period;
    }

    try {
      setSubmitting(true);
      const res = await createSubscription(payload);
      toast.success('Subscription contract provisioned successfully in DRAFT state.');
      const newId = res.data?.id;
      if (newId) {
        navigate(`/subscriptions/${newId}`);
      } else {
        navigate('/subscriptions');
      }
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to create subscription contract'));
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="INITIALIZING PROVISIONING CONSOLE..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 05-NEW"
        title="Provision Subscription"
        subtitle="Establish a new recurring service contract with custom item allocations and tax parameters."
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/subscriptions')}>
            <ArrowLeft className="w-4 h-4 mr-1 text-[#55636c]" />
            RETURN TO MATRIX
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Tier & Customer Configuration Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card
            bayNumber="PANEL 01"
            title="Entity & Plan Selection"
            subtitle="Target account and core recurring billing cycle."
            variant="chassis"
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-2">
              <Select
                label="Customer Account"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email}) {c.company_name ? `— ${c.company_name}` : ''}
                  </option>
                ))}
              </Select>

              <Select
                label="Subscription Plan"
                value={planId}
                onChange={(e) => handlePlanChange(e.target.value)}
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.billing_period}] — ${p.price}
                  </option>
                ))}
              </Select>

              <Select
                label="Quotation Preset (Optional)"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                hint="Loads default line items"
              >
                <option value="">-- No Preset Selected --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.items?.length || 0} items)
                  </option>
                ))}
              </Select>

              <div className="flex flex-col gap-1.5">
                <label className="engraved-label cursor-pointer flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-label/40" />
                  Contract Specifications / Notes
                </label>
                <input
                  type="text"
                  placeholder="Deployment remarks, SLA specifics..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#f4f6f7] text-[#181e22] font-mono text-xs px-3 py-2 rounded-key border border-[#9aa3a8] shadow-well focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </Card>

          {/* Tax & Discount Modifiers Panel */}
          <Card
            bayNumber="PANEL 02"
            title="Fiscal Modifiers"
            subtitle="Automated tax calculation and promotional adjustments."
            variant="chassis"
          >
            <div className="flex flex-col gap-4 font-mono text-xs pt-2">
              <Select
                label="Sales Tax Rate"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                hint="Applied upon invoice generation"
              >
                <option value="">-- No Tax Applied (0%) --</option>
                {taxes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.rate}%)
                  </option>
                ))}
              </Select>

              <Select
                label="Promotional Discount"
                value={discountId}
                onChange={(e) => setDiscountId(e.target.value)}
                hint="Eligibility validated by server"
              >
                <option value="">-- No Discount Applied --</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name} ({d.type === 'percentage' ? `${d.value}%` : `$${d.value}`})
                  </option>
                ))}
              </Select>
            </div>
          </Card>
        </div>

        {/* Line Items Editor Section */}
        <Card
          bayNumber="PANEL 03"
          title="Line Item Breakdown"
          subtitle="Configure unit allocation and hardware subscription licenses."
          variant="chassis"
        >
          <SubscriptionItemsEditor
            items={items}
            onChange={setItems}
            products={products}
            readOnly={false}
          />
        </Card>

        {/* Submission Action Bar */}
        <div className="flex items-center justify-between p-4 bg-[#cbd0d2] rounded-lg border border-[#9ba5aa]">
          <span className="font-mono text-xs text-[#55636c]">
            Initial contract will be staged in <strong className="text-[#181e22]">DRAFT</strong> state.
          </span>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/subscriptions')}
              disabled={submitting}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              indicator="green"
              loading={submitting}
            >
              <Save className="w-4 h-4 mr-1 text-white" />
              CREATE SUBSCRIPTION
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SubscriptionCreate;
