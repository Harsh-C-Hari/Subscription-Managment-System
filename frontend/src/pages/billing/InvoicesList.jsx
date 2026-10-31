import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, DataTable, StatusBadge, Button, Input, Select, useToast } from '../../components/ui';
import { RunBillingModal } from '../../components/billing/RunBillingModal';
import { getInvoices, formatApiError } from '../../api/billing';
import { formatDate, formatMoney } from '../../utils/format';
import { Play, RefreshCw, Search, AlertCircle, FileText } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Invoice Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function InvoicesList() {
  const navigate = useNavigate();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showRunBillingModal, setShowRunBillingModal] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
      };
      if (statusFilter) params.status = statusFilter;
      if (overdueOnly) params.overdue = 'true';
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getInvoices(params);
      const items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      setInvoices(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch invoices'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, overdueOnly, debouncedSearch, toast]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoice_number',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          {row.is_overdue && (
            <span className="led-lamp led-orange animate-pulse" title="Overdue Payment Alert" />
          )}
          <span className="font-bold text-[#181e22] group-hover:text-accent transition-colors">
            {val || row.id}
          </span>
        </div>
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
      header: 'Issue / Due Date',
      key: 'issue_date',
      render: (val, row) => (
        <div className="flex flex-col text-xs text-[#55636c]">
          <span>ISS: {formatDate(val)}</span>
          <span className={row.is_overdue ? 'text-red-600 font-bold' : ''}>
            DUE: {formatDate(row.due_date)}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={val} />
          {row.is_overdue && val !== 'paid' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-300">
              OVERDUE
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Total',
      key: 'total',
      className: 'text-right',
      render: (val) => (
        <span className="font-bold text-[#181e22]">{formatMoney(val)}</span>
      ),
    },
    {
      header: 'Outstanding',
      key: 'outstanding',
      className: 'text-right',
      render: (val) => (
        <span className={`font-mono font-bold ${parseFloat(val) > 0 ? 'text-[#f15b22]' : 'text-emerald-700'}`}>
          {formatMoney(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 06"
        title="Receivables & Invoices"
        subtitle="Itemized invoice records, payment reconciliation status, and automated billing runs."
        status="ONLINE"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="raised"
              size="sm"
              onClick={loadInvoices}
              aria-label="Refresh invoices"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="accent"
              size="sm"
              indicator="orange"
              onClick={() => setShowRunBillingModal(true)}
            >
              <Play className="w-3.5 h-3.5 mr-1 text-white fill-current" />
              RUN BILLING
            </Button>
          </div>
        }
      />

      {/* Filter and Query Deck */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#cbd0d2] rounded-lg border border-[#9ba5aa]">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search invoice number or customer name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-44"
          />

          <Button
            variant={overdueOnly ? 'danger' : 'raised'}
            size="sm"
            onClick={() => {
              setOverdueOnly(!overdueOnly);
              setPage(1);
            }}
            indicator={overdueOnly ? 'orange' : false}
            className="text-xs"
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {overdueOnly ? 'OVERDUE FILTER ACTIVE' : 'FILTER OVERDUE'}
          </Button>
        </div>
      </div>

      {/* Matrix Table */}
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        emptyTitle="NO INVOICES MATCH TELEMETRY"
        emptyDescription="Try clearing search filters or run billing to generate new invoices."
      />

      {/* Bulk Run Billing Modal */}
      <RunBillingModal
        isOpen={showRunBillingModal}
        onClose={() => setShowRunBillingModal(false)}
        onSuccess={loadInvoices}
      />
    </div>
  );
}

export default InvoicesList;
