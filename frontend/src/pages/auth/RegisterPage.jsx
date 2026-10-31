import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, useToast } from '../../components/ui';
import { User, Mail, Lock, Building, Phone, MapPin, ShieldAlert } from 'lucide-react';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    company_name: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password.length < 8) {
      setErrorMessage('Security key must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      toast.success('Registration completed. Please sign in with your credentials.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Registration failed.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#cbd0d2] chassis-texture flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-[#cbd0d2] rounded-xl border-4 border-[#9aa3a8] p-1 shadow-2xl relative">
          <span className="screw-head absolute top-2 left-2" />
          <span className="screw-head absolute top-2 right-2" />
          <span className="screw-head absolute bottom-2 left-2" />
          <span className="screw-head absolute bottom-2 right-2" />

          <div className="bg-[#d8dee1] rounded-lg border border-white/60 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#b6bec2] mb-6">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="led-lamp led-orange" />
                  <span className="engraved-label text-[10px] tracking-widest text-[#55636c]">
                    PORTAL ONBOARDING // NEW ACCOUNT
                  </span>
                </div>
                <h2 className="font-sans font-bold text-2xl text-[#181e22] tracking-tight">
                  Customer Registration Deck
                </h2>
              </div>
              <div className="w-14 h-3.5 rounded chassis-vent border border-black/30" />
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 rounded bg-[#fff0ec] border-2 border-accent text-accent flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs font-mono">
                  <span className="font-bold uppercase tracking-wider block">REGISTRATION ERROR:</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="FULL OPERATOR NAME *"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Ann Lee"
                  icon={User}
                  required
                />
              </div>

              <div>
                <Input
                  label="EMAIL IDENTIFIER *"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. ann@example.com"
                  icon={Mail}
                  required
                />
              </div>

              <div>
                <Input
                  label="SECURITY KEY (MIN 8 CHARS) *"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 chars"
                  icon={Lock}
                  required
                />
              </div>

              <div>
                <Input
                  label="ORGANIZATION / COMPANY"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Instruments"
                  icon={Building}
                />
              </div>

              <div>
                <Input
                  label="CONTACT PHONE"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 555-0199"
                  icon={Phone}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="FACILITY ADDRESS"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. 742 Foundry Bay, Industrial Sector 4"
                  icon={MapPin}
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex flex-col gap-3">
                <Button
                  type="submit"
                  variant="raised"
                  indicator="orange"
                  loading={loading}
                  className="w-full py-2.5 font-bold uppercase tracking-wider"
                >
                  INITIALIZE CUSTOMER PROFILE
                </Button>

                <div className="text-center font-mono text-xs text-[#55636c]">
                  Already registered?{' '}
                  <Link to="/login" className="text-[#181e22] hover:text-accent font-bold underline">
                    Connect to operator console &rarr;
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
