import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Button, useToast } from '../../components/ui';
import { getPayments, formatApiError } from '../../api/billing';
import { formatDateTime, formatMoney } from '../../utils/format';
import { RefreshCw, CreditCard } from 'lucide-react';

export function MyPayments() {
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPayments({ page, page_size: pageSize });
      const items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      setPayments(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch payment settlements'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const columns = [
    {
      header: 'Payment Reference',
      key: 'reference',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-[#181e22]">{val || row.id}</span>
          {row.notes && <span className="text-[10px] text-[#55636c]">{row.notes}</span>}
        </div>
      ),
    },
    {
      header: 'Applied Invoice',
      key: 'invoice_number',
      render: (val, row) => (
        <span className="font-semibold text-[#181e22]">
          {val || row.invoice_id || '—'}
        </span>
      ),
    },
    {
      header: 'Settlement Method',
      key: 'method',
      render: (val) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#e7eaeb] border border-[#9aa3a8] text-[#414b52] uppercase">
          <CreditCard className="w-3 h-3 text-accent" />
          {val}
        </span>
      ),
    },
    {
      header: 'Timestamp',
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
        <span className="font-mono font-bold text-sm text-emerald-700">
          {formatMoney(val)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="PORTAL 04"
        title="Settlement Receipts & History"
        subtitle="Audited ledger of recorded wire transfers, credit settlements, and remittance receipts."
        status="CONNECTED"
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

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        emptyTitle="NO RECORDED SETTLEMENTS"
        emptyDescription="No payment transactions are recorded on this customer account ledger."
      />
    </div>
  );
}

export default MyPayments;
