import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, StatusBadge, Button, Input, Select, useToast } from '../../components/ui';
import { getSubscriptions, formatApiError } from '../../api/billing';
import { formatDate, formatMoney } from '../../utils/format';
import { Plus, RefreshCw, Search, Filter } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Lifecycle Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

export function SubscriptionsList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getSubscriptions(params);
      const items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      setSubscriptions(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to retrieve subscriptions telemetry'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const columns = [
    {
      header: 'Sub Number',
      key: 'subscription_number',
      render: (val, row) => (
        <span className="font-bold text-[#181e22] group-hover:text-accent transition-colors">
          {val || row.id}
        </span>
      ),
    },
    {
      header: 'Customer',
      key: 'customer',
      render: (val) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[#181e22]">{val?.full_name || '—'}</span>
          <span className="text-[10px] text-[#55636c]">{val?.email}</span>
        </div>
      ),
    },
    {
      header: 'Service Plan',
      key: 'plan',
      render: (val) => (
        <span className="font-medium text-[#414b52]">
          {val?.name || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Next Billing',
      key: 'next_billing_date',
      render: (val) => (
        <span className="text-xs text-[#55636c]">{formatDate(val)}</span>
      ),
    },
    {
      header: 'Subtotal / Items',
      key: 'items',
      render: (val) => {
        if (!val || val.length === 0) return '—';
        const sum = val.reduce((acc, it) => acc + (parseFloat(it.line_total || it.unit_price) || 0), 0);
        return (
          <div className="flex flex-col">
            <span className="font-bold text-[#181e22]">{formatMoney(sum.toFixed(2))}</span>
            <span className="text-[10px] text-[#55636c]">{val.length} item(s)</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 05"
        title="Subscription Contracts"
        subtitle="Manage recurring customer tiers, schedule transitions, and line-item allocations."
        status="ONLINE"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="raised"
              size="sm"
              onClick={loadSubscriptions}
              aria-label="Refresh subscriptions"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="accent"
              size="sm"
              indicator="orange"
              onClick={() => navigate('/subscriptions/new')}
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-white" />
              NEW SUBSCRIPTION
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#cbd0d2] rounded-lg border border-[#9ba5aa]">
        <div className="sm:col-span-2">
          <Input
            icon={Search}
            placeholder="Search by subscription ID or customer name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onRowClick={(row) => navigate(`/subscriptions/${row.id}`)}
        emptyTitle="NO SUBSCRIPTION RECORDS"
        emptyDescription="No subscription contracts match the selected filters."
      />
    </div>
  );
}

export default SubscriptionsList;
