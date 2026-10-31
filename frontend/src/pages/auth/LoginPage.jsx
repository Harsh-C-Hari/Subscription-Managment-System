import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, useToast } from '../../components/ui';
import { KeyRound, Mail, Gauge, ShieldAlert } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Access Granted: Welcome Operator ${user.full_name || user.email}`);
      if (user.role === 'customer') {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Authentication failed. Check credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setEmail('admin@brightloop.com');
    setPassword('Admin@12345');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#cbd0d2] chassis-texture flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Housing Panel Frame */}
        <div className="bg-[#cbd0d2] rounded-xl border-4 border-[#9aa3a8] p-1 shadow-2xl relative">
          <span className="screw-head absolute top-2 left-2" />
          <span className="screw-head absolute top-2 right-2" />
          <span className="screw-head absolute bottom-2 left-2" />
          <span className="screw-head absolute bottom-2 right-2" />

          <div className="bg-[#d8dee1] rounded-lg border border-white/60 p-6 sm:p-8">
            {/* Console Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#b6bec2] mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#20272b] border border-[#161a1d] shadow-screen flex items-center justify-center text-accent">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="led-lamp led-orange" />
                    <span className="font-sans font-extrabold text-xl tracking-tight text-[#181e22]">
                      BRIGHTLOOP
                    </span>
                  </div>
                  <span className="engraved-label text-[10px] tracking-widest text-[#55636c]">
                    OPERATOR CONSOLE // LOGIN
                  </span>
                </div>
              </div>

              <div className="w-12 h-3 rounded chassis-vent border border-black/30" />
            </div>

            {/* Error Annunciator */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded bg-[#fff0ec] border-2 border-accent text-accent flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs font-mono">
                  <span className="font-bold uppercase tracking-wider block">AUTH ERROR:</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="OPERATOR IDENTIFIER (EMAIL)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@brightloop.com"
                icon={Mail}
                required
                autoFocus
              />

              <Input
                label="SECURITY KEY (PASSWORD)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                icon={KeyRound}
                required
              />

              <div className="flex items-center justify-between font-mono text-xs pt-1">
                <Link
                  to="/forgot-password"
                  className="text-[#55636c] hover:text-accent transition-colors underline"
                >
                  Forgot security key?
                </Link>
                <Link
                  to="/register"
                  className="text-[#181e22] hover:text-accent font-semibold transition-colors"
                >
                  New customer register &rarr;
                </Link>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  type="submit"
                  variant="raised"
                  indicator="orange"
                  loading={loading}
                  className="w-full py-2.5 font-bold tracking-wider uppercase"
                >
                  AUTHENTICATE OPERATOR
                </Button>

                {/* Pre-fill Quick Action */}
                <button
                  type="button"
                  onClick={fillAdmin}
                  className="w-full py-1.5 px-3 rounded text-[11px] font-mono text-[#414b52] bg-[#cbd0d2] hover:bg-[#b6bec2] border border-[#9aa3a8] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="led-lamp led-green !w-1.5 !h-1.5" />
                  PRE-FILL SEEDED ADMIN (admin@brightloop.com)
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
