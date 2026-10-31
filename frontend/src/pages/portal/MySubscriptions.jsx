import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, StatusBadge, Button, Modal, Spinner, useToast } from '../../components/ui';
import { getSubscriptions, formatApiError } from '../../api/billing';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';
import { RefreshCw, Layers, Eye, Calendar, Tag, Receipt } from 'lucide-react';

export function MySubscriptions() {
  const toast = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);

  // Detail Modal State
  const [selectedSub, setSelectedSub] = useState(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSubscriptions({ page, page_size: pageSize });
      const items = res.data?.items || res.data || [];
      const totalCount = res.data?.total !== undefined ? res.data.total : items.length;

      setSubscriptions(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to fetch subscriptions'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

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
      header: 'Tier / Plan',
      key: 'plan',
      render: (val) => (
        <span className="font-semibold text-[#181e22]">{val?.name || '—'}</span>
      ),
    },
    {
      header: 'Billing Cycle',
      key: 'plan_period',
      render: (_, row) => (
        <span className="font-mono text-xs uppercase text-[#55636c]">
          {row.plan?.billing_period || 'MONTHLY'}
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
        <span className="font-mono text-xs text-[#55636c]">{formatDate(val)}</span>
      ),
    },
    {
      header: 'Actions',
      key: 'id',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSub(row);
          }}
          className="text-xs"
        >
          <Eye className="w-3.5 h-3.5 mr-1 text-accent" />
          DETAILS
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="PORTAL 02"
        title="My Provisioned Subscriptions"
        subtitle="Review active recurring tiers, licensed hardware allocations, and renewal schedules."
        status="CONNECTED"
        actions={
          <Button
            variant="raised"
            size="sm"
            onClick={loadSubscriptions}
            aria-label="Refresh subscriptions"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#55636c] ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onRowClick={(row) => setSelectedSub(row)}
        emptyTitle="NO ACTIVE SUBSCRIPTIONS"
        emptyDescription="You have no registered subscription contracts. Contact sales to provision a service tier."
      />

      {/* Subscription Detail Dialog */}
      <Modal
        isOpen={Boolean(selectedSub)}
        onClose={() => setSelectedSub(null)}
        bayNumber="PORTAL 02-DET"
        title={`Subscription ${selectedSub?.subscription_number || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSub && (
          <div className="flex flex-col gap-5 font-mono text-xs pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#e7eaeb] rounded border border-[#9aa3a8]">
              <div>
                <span className="text-[#55636c] block text-[10px] uppercase">Status</span>
                <StatusBadge status={selectedSub.status} />
              </div>
              <div>
                <span className="text-[#55636c] block text-[10px] uppercase">Plan</span>
                <span className="font-bold text-[#181e22]">{selectedSub.plan?.name}</span>
              </div>
              <div>
                <span className="text-[#55636c] block text-[10px] uppercase">Started</span>
                <span className="text-[#181e22]">{formatDate(selectedSub.start_date)}</span>
              </div>
              <div>
                <span className="text-[#55636c] block text-[10px] uppercase">Next Renewal</span>
                <span className="font-bold text-accent">{formatDate(selectedSub.next_billing_date)}</span>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <span className="font-bold text-[#181e22] block mb-2 uppercase tracking-wider text-[11px]">
                Provisioned Components & Licenses ({selectedSub.items?.length || 0})
              </span>
              <div className="rounded border border-[#9aa3a8] bg-white overflow-hidden shadow-inner">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#b6bec2] text-[#181e22] border-b border-[#9aa3a8]">
                    <tr>
                      <th className="py-2 px-3 uppercase">Component</th>
                      <th className="py-2 px-3 uppercase text-center w-20">Qty</th>
                      <th className="py-2 px-3 uppercase text-right w-28">Unit Price</th>
                      <th className="py-2 px-3 uppercase text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c2c9cc]">
                    {selectedSub.items && selectedSub.items.length > 0 ? (
                      selectedSub.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="py-2 px-3 font-semibold text-[#181e22]">{it.description}</td>
                          <td className="py-2 px-3 text-center">{it.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatMoney(it.unit_price)}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#181e22]">{formatMoney(it.line_total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#55636c]">
                          No component details available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#b6bec2]">
              <Button variant="raised" size="sm" onClick={() => setSelectedSub(null)}>
                CLOSE TELEMETRY
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MySubscriptions;
