import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, DataTable, Button, Input, Select, useToast } from '../../components/ui';
import { getPayments, formatApiError } from '../../api/billing';
import { formatDateTime, formatMoney } from '../../utils/format';
import { RefreshCw, CreditCard, Search } from 'lucide-react';

const METHOD_OPTIONS = [
  { value: '', label: 'All Payment Methods' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'bank_transfer', label: 'Wire / Bank Transfer' },
  { value: 'upi', label: 'UPI / Direct Transfer' },
  { value: 'cash', label: 'Cash Settlement' },
  { value: 'other', label: 'Other Ledger' },
];

export function PaymentsList() {
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const [methodFilter, setMethodFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
      };
      if (methodFilter) params.method = methodFilter;

      const res = await getPayments(params);
      let items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(
          (p) =>
            p.reference?.toLowerCase().includes(q) ||
            p.invoice_number?.toLowerCase().includes(q) ||
            p.customer_name?.toLowerCase().includes(q) ||
            p.id?.toLowerCase().includes(q)
        );
      }

      setPayments(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch payments matrix'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, methodFilter, searchQuery, toast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const columns = [
    {
      header: 'Payment Reference',
      key: 'reference',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#181e22]">{val || row.id}</span>
          {row.notes && <span className="text-[10px] text-[#55636c]">{row.notes}</span>}
        </div>
      ),
    },
    {
      header: 'Associated Invoice',
      key: 'invoice_number',
      render: (val, row) =>
        row.invoice_id ? (
          <Link
            to={`/invoices/${row.invoice_id}`}
            className="font-bold text-[#181e22] hover:text-accent underline transition-colors"
          >
            {val || row.invoice_id}
          </Link>
        ) : (
          <span className="text-[#55636c]">{val || '—'}</span>
        ),
    },
    {
      header: 'Customer',
      key: 'customer_name',
      render: (val, row) => (
        <span className="font-medium text-[#181e22]">
          {val || row.customer_id || '—'}
        </span>
      ),
    },
    {
      header: 'Method',
      key: 'method',
      render: (val) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#e7eaeb] border border-[#9aa3a8] text-[#414b52] uppercase">
          <CreditCard className="w-3 h-3 text-accent" />
          {val}
        </span>
      ),
    },
    {
      header: 'Date & Time',
      key: 'paid_at',
      render: (val) => (
        <span className="text-xs text-[#55636c]">{formatDateTime(val)}</span>
      ),
    },
    {
      header: 'Settled Amount',
      key: 'amount',
      className: 'text-right',
      render: (val) => (
        <span className="font-bold text-sm text-emerald-700">
          {formatMoney(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 07"
        title="Payment Settlements Ledger"
        subtitle="Verified financial transactions, wire transfers, and automated gateway authorizations."
        status="ONLINE"
        actions={
          <Button
            variant="raised"
            size="sm"
            onClick={loadPayments}
            aria-label="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#cbd0d2] rounded-lg border border-[#9ba5aa]">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Search by reference ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            options={METHOD_OPTIONS}
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        emptyTitle="NO RECORDED PAYMENTS"
        emptyDescription="No transaction settlements have been recorded in this ledger range."
      />
    </div>
  );
}

export default PaymentsList;
