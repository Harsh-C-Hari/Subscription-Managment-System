import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
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
  Mail,
  Building,
  Phone,
  MapPin,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

export function CustomersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    company_name: '',
    address: '',
    password: '',
  });

  // Temporary password alert modal
  const [tempPasswordModal, setTempPasswordModal] = useState({
    isOpen: false,
    email: '',
    password: '',
  });
  const [copied, setCopied] = useState(false);

  // Staff creation modal (Admin only)
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffFormSubmitting, setStaffFormSubmitting] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    full_name: '',
    password: '',
    phone: '',
    company_name: 'Brightloop Operations',
    address: '',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
      };
      if (search) params.search = search;
      if (isActiveFilter !== '') params.is_active = isActiveFilter;

      const res = await api.get('/customers', { params });
      setCustomers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, isActiveFilter, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      company_name: '',
      address: '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      email: cust.email,
      full_name: cust.full_name,
      phone: cust.phone || '',
      company_name: cust.company_name || '',
      address: cust.address || '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (editingCustomer) {
        const payload = {
          full_name: formData.full_name,
          phone: formData.phone,
          company_name: formData.company_name,
          address: formData.address,
        };
        await api.put(`/customers/${editingCustomer.id}`, payload);
        toast.success(`Customer "${formData.full_name}" updated`);
        setModalOpen(false);
      } else {
        const payload = { ...formData };
        if (!payload.password) delete payload.password; // trigger server generated temp password

        const res = await api.post('/customers', payload);
        toast.success(`Customer account initialized`);
        setModalOpen(false);

        // If backend returned temporary_password, show the credential modal!
        if (res.data?.temporary_password) {
          setTempPasswordModal({
            isOpen: true,
            email: res.data.email,
            password: res.data.temporary_password,
          });
        }
      }

      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save customer');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Deactivate customer account for "${cust.full_name}"?`)) return;
    try {
      await api.delete(`/customers/${cust.id}`);
      toast.success(`Customer "${cust.full_name}" deactivated`);
      fetchCustomers();
    } catch (err) {
      toast.error('Failed to deactivate customer');
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPasswordModal.password);
    setCopied(true);
    toast.success('Temporary password copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenCreateStaff = () => {
    setStaffForm({
      email: '',
      full_name: '',
      password: '',
      phone: '',
      company_name: 'Brightloop Operations',
      address: '',
    });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (staffForm.password.length < 8) {
      toast.error('Staff password must be at least 8 characters');
      return;
    }
    setStaffFormSubmitting(true);
    try {
      await api.post('/auth/staff', staffForm);
      toast.success(`Staff operator "${staffForm.full_name}" registered with role: staff`);
      setStaffModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create staff account');
    } finally {
      setStaffFormSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: 'CUSTOMER NAME',
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[#181e22]">{row.full_name}</span>
          <span className="text-[11px] text-[#55636c]">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'company_name',
      header: 'ORGANIZATION',
      render: (val) => (
        <span className="font-mono text-xs text-[#181e22]">
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'TELEPHONE',
      render: (val) => (
        <span className="font-mono text-xs text-[#55636c]">
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'ACCOUNT STATUS',
      render: (val) => <StatusBadge status={val ? 'active' : 'inactive'} />,
    },
    {
      key: 'created_at',
      header: 'ENROLLED',
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      header: 'CONTROLS',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="raised"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            className="text-[11px] py-0.5 px-2"
            aria-label="Edit customer"
          >
            <Edit2 className="w-3 h-3 text-[#55636c]" />
          </Button>

          {isAdmin && row.is_active && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteCustomer(row)}
              className="text-[11px] py-0.5 px-2"
              aria-label="Deactivate customer"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        bayNumber="BAY 04"
        title="Customer Directory Deck"
        subtitle="Maintain account matrices, contact metadata, and provision operator access credentials."
        status="ACCOUNTS ACTIVE"
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="raised"
                size="sm"
                onClick={handleOpenCreateStaff}
                className="text-xs font-semibold"
              >
                PROVISION STAFF OPERATOR
              </Button>
            )}
            <Button
              variant="accent"
              indicator="green"
              onClick={handleOpenCreate}
              className="text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1" />
              ENROLL NEW CUSTOMER
            </Button>
          </div>
        }
      />

      {/* Query Bar */}
      <div className="panel-well rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-2 border-[#9ba5aa]">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by customer name, email, or company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            icon={Search}
          />
        </div>

        <div className="w-full sm:w-52">
          <Select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">ALL STATUSES</option>
            <option value="true">ACTIVE ACCOUNTS</option>
            <option value="false">INACTIVE ACCOUNTS</option>
          </Select>
        </div>
      </div>

      {/* Matrix Table */}
      <DataTable
        columns={columns}
        data={customers}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyTitle="NO CUSTOMERS FOUND"
        emptyDescription="No customer accounts match your search query."
      />

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Update Customer Record' : 'Enroll New Customer'}
        bayNumber="BAY 04-A // ACCOUNT PROVISIONING"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="FULL OPERATOR / CONTACT NAME *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Ann Lee"
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              label="EMAIL ADDRESS *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. ann@example.com"
              icon={Mail}
              disabled={!!editingCustomer}
              hint={editingCustomer ? 'Immutable' : undefined}
              required
            />
          </div>

          <div>
            <Input
              label="ORGANIZATION / COMPANY"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g. Apex Precision"
              icon={Building}
            />
          </div>

          <div>
            <Input
              label="CONTACT PHONE"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 555-0199"
              icon={Phone}
            />
          </div>

          <div>
            {!editingCustomer ? (
              <Input
                label="PASSWORD (LEAVE BLANK TO AUTO-GENERATE)"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Optional manual password"
                icon={KeyRound}
                hint="Server creates temp password if blank"
              />
            ) : (
              <div className="h-full flex items-end">
                <span className="font-mono text-xs text-[#55636c] bg-[#cbd0d2] p-2 rounded border border-[#9aa3a8] w-full">
                  Password changes require customer re-key
                </span>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Input
              label="PHYSICAL FACILITY ADDRESS"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Facility / shipping address"
              icon={MapPin}
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 border-t border-[#b6bec2]">
            <Button variant="raised" onClick={() => setModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              indicator="orange"
              loading={formSubmitting}
            >
              {editingCustomer ? 'UPDATE PROFILE' : 'PROVISION ACCOUNT'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Temporary Password Credential Modal */}
      <Modal
        isOpen={tempPasswordModal.isOpen}
        onClose={() => setTempPasswordModal({ isOpen: false, email: '', password: '' })}
        title="Temporary Security Credential"
        bayNumber="SECURITY ALERT // ONE-TIME DISPATCH"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-[#fff0ec] border-2 border-accent rounded text-[#181e22] text-xs font-mono flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-accent block uppercase">IMPORTANT NOTICE:</span>
              <span>
                This temporary password will only be displayed <strong>once</strong>. Copy and securely transmit it to the customer operator.
              </span>
            </div>
          </div>

          <div className="panel-screen rounded p-4 flex flex-col gap-2 font-mono text-xs">
            <span className="text-[#9aa3a8]">ACCOUNT IDENTIFIER:</span>
            <span className="text-white font-bold">{tempPasswordModal.email}</span>

            <span className="text-[#9aa3a8] mt-2">ONE-TIME ACCESS KEY:</span>
            <div className="bg-[#161a1d] p-3 rounded border border-accent flex items-center justify-between gap-2">
              <span className="text-accent font-bold text-sm tracking-wider select-all">
                {tempPasswordModal.password}
              </span>
              <Button
                variant="raised"
                size="sm"
                onClick={handleCopyPassword}
                className="py-1 px-2.5 text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY'}</span>
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="accent"
              onClick={() => setTempPasswordModal({ isOpen: false, email: '', password: '' })}
            >
              ACKNOWLEDGE & CLOSE
            </Button>
          </div>
        </div>
      </Modal>
      {/* Staff Operator Provisioning Modal (Admin Only) */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Provision Staff Operator"
        bayNumber="SECURITY BAY // STAFF PROVISIONING"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="STAFF OPERATOR FULL NAME *"
              value={staffForm.full_name}
              onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
              placeholder="e.g. Lead Technician Sarah"
              required
              autoFocus
            />
          </div>

          <div>
            <Input
              label="STAFF EMAIL IDENTIFIER *"
              type="email"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              placeholder="e.g. tech@brightloop.com"
              icon={Mail}
              required
            />
          </div>

          <div>
            <Input
              label="INITIAL SECURITY KEY (MIN 8 CHARS) *"
              type="password"
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              placeholder="At least 8 characters"
              icon={KeyRound}
              required
            />
          </div>

          <div>
            <Input
              label="ORGANIZATION / DIVISION"
              value={staffForm.company_name}
              onChange={(e) => setStaffForm({ ...staffForm, company_name: e.target.value })}
              placeholder="e.g. Brightloop Operations"
              icon={Building}
            />
          </div>

          <div>
            <Input
              label="DIRECT CONTACT PHONE"
              value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
              placeholder="+1 800-555-0188"
              icon={Phone}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="OPERATING FACILITY / STATION"
              value={staffForm.address}
              onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
              placeholder="e.g. Control Deck 2, Station 4"
              icon={MapPin}
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-3 border-t border-[#b6bec2]">
            <Button variant="raised" onClick={() => setStaffModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              type="submit"
              variant="accent"
              indicator="green"
              loading={staffFormSubmitting}
            >
              INITIALIZE STAFF CREDENTIALS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CustomersPage;
