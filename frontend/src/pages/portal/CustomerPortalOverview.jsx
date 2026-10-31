import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Button } from '../../components/ui';
import { RefreshCw, FileText, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CustomerPortalOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="PORTAL 01"
        title="Customer Terminal Deck"
        subtitle={`Welcome, ${user?.full_name || user?.email}. Access your active subscriptions, invoices, and payment history.`}
        status="CONNECTED"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          bayNumber="MODULE 01"
          title="My Subscriptions"
          subtitle="View active tiers, renewal schedules, and duration anchors."
          variant="chassis"
        >
          <div className="pt-3 flex flex-col gap-3">
            <p className="font-mono text-xs text-[#55636c]">
              Review your provisioned hardware nodes and recurring service tiers.
            </p>
            <Button
              variant="raised"
              indicator="green"
              onClick={() => navigate('/portal/subscriptions')}
              className="w-full text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-accent" />
              VIEW SUBSCRIPTIONS
            </Button>
          </div>
        </Card>

        <Card
          bayNumber="MODULE 02"
          title="Invoices & Statements"
          subtitle="Download audited PDF statements and review outstanding balances."
          variant="chassis"
        >
          <div className="pt-3 flex flex-col gap-3">
            <p className="font-mono text-xs text-[#55636c]">
              Access itemized invoices, sales tax breakdowns, and payment statuses.
            </p>
            <Button
              variant="raised"
              indicator="orange"
              onClick={() => navigate('/portal/invoices')}
              className="w-full text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-accent" />
              VIEW INVOICES
            </Button>
          </div>
        </Card>

        <Card
          bayNumber="MODULE 03"
          title="Settlements & Receipts"
          subtitle="Verified transaction ledger and payment receipts."
          variant="chassis"
        >
          <div className="pt-3 flex flex-col gap-3">
            <p className="font-mono text-xs text-[#55636c]">
              Track recorded bank transfers, card settlements, and credit balances.
            </p>
            <Button
              variant="raised"
              onClick={() => navigate('/portal/payments')}
              className="w-full text-xs"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1 text-accent" />
              VIEW PAYMENTS
            </Button>
          </div>
        </Card>
      </div>

      <Card
        bayNumber="PROFILE 01"
        title="Account Credentials & Facility Information"
        subtitle="Current profile specifications on the Brightloop central ledger."
        variant="screen"
        vents
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs pt-2">
          <div>
            <span className="text-[#9aa3a8] block text-[10px]">NAME</span>
            <span className="text-white font-bold">{user?.full_name || '—'}</span>
          </div>
          <div>
            <span className="text-[#9aa3a8] block text-[10px]">ORGANIZATION</span>
            <span className="text-white font-bold">{user?.company_name || '—'}</span>
          </div>
          <div>
            <span className="text-[#9aa3a8] block text-[10px]">COMMUNICATION EMAIL</span>
            <span className="text-white font-bold">{user?.email || '—'}</span>
          </div>
          <div>
            <span className="text-[#9aa3a8] block text-[10px]">FACILITY ADDRESS</span>
            <span className="text-white font-bold">{user?.address || '—'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default CustomerPortalOverview;
