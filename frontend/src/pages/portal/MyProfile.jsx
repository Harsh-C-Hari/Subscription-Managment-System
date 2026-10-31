import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Card, Button, Input, useToast } from '../../components/ui';
import api from '../../api/client';
import { formatApiError } from '../../api/billing';
import { User, Mail, Building, Phone, MapPin, Save, ShieldCheck } from 'lucide-react';

export function MyProfile() {
  const { user } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSaving(true);
      // Customer self update per API_CONTRACT §6
      await api.put(`/customers/${user.id}`, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        company_name: companyName.trim(),
        address: address.trim(),
      });

      // Update cached user in localStorage if possible
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...parsed,
            full_name: fullName,
            phone,
            company_name: companyName,
            address,
          })
        );
      }

      toast.success('Account profile updated successfully.');
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to update account profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="PORTAL 05"
        title="Subscriber Account Profile"
        subtitle="Manage communication credentials, corporate organization entity, and facility address."
        status="CONNECTED"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card
          bayNumber="PANEL 01"
          title="Account Credentials"
          subtitle="Your verified central ledger identity."
          variant="chassis"
        >
          <div className="flex flex-col gap-4 font-mono text-xs pt-2">
            <div className="flex items-center gap-3 p-3 bg-[#e7eaeb] rounded border border-[#9aa3a8]">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold text-base">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#181e22] text-sm">{user?.full_name || 'Subscriber'}</span>
                <span className="text-[#55636c] text-[11px]">{user?.email}</span>
              </div>
            </div>

            <div className="divide-y divide-[#c2c9cc] text-[#414b52]">
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#55636c]">SYSTEM ROLE</span>
                <span className="inline-flex items-center gap-1 font-bold text-accent">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user?.role?.toUpperCase() || 'CUSTOMER'}
                </span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#55636c]">ACCOUNT ID</span>
                <span className="font-bold text-[#181e22]">{user?.id || '—'}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#55636c]">STATUS</span>
                <span className="text-emerald-700 font-bold">VERIFIED ACTIVE</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card
          bayNumber="PANEL 02"
          title="Facility & Contact Information"
          subtitle="Update company and communication endpoints."
          variant="chassis"
          className="lg:col-span-2"
        >
          <form onSubmit={handleUpdate} className="flex flex-col gap-4 font-mono text-xs pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Contact Name"
                icon={User}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Communication Email (Permanent)"
                icon={Mail}
                value={user?.email || ''}
                disabled
                hint="Contact admin to reassign email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization / Company Name"
                icon={Building}
                placeholder="e.g. Acme Industrial Labs"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />

              <Input
                label="Telephone / Voice Endpoint"
                icon={Phone}
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="engraved-label cursor-pointer flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                Physical Facility Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Station building, bay sector, postal code..."
                className="w-full bg-[#f4f6f7] text-[#181e22] font-mono text-xs p-2.5 rounded-key border border-[#9aa3a8] shadow-well focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[#b6bec2]">
              <Button
                type="submit"
                variant="accent"
                size="md"
                indicator="green"
                loading={saving}
              >
                <Save className="w-4 h-4 mr-1 text-white" />
                UPDATE PROFILE
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default MyProfile;
