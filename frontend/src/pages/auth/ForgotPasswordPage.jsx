import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Button, Input, useToast } from '../../components/ui';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success('Reset instructions generated');
      if (res.data?.reset_token) {
        setDevToken(res.data.reset_token);
      }
    } catch {
      toast.error('Unable to process password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#cbd0d2] chassis-texture flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#cbd0d2] rounded-xl border-4 border-[#9aa3a8] p-1 shadow-2xl relative">
          <span className="screw-head absolute top-2 left-2" />
          <span className="screw-head absolute top-2 right-2" />
          <span className="screw-head absolute bottom-2 left-2" />
          <span className="screw-head absolute bottom-2 right-2" />

          <div className="bg-[#d8dee1] rounded-lg border border-white/60 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#b6bec2] mb-6">
              <div>
                <span className="engraved-label text-[10px] tracking-widest text-[#55636c]">
                  SECURITY RECOVERY // RE-KEY
                </span>
                <h3 className="font-sans font-bold text-xl text-[#181e22] tracking-tight">
                  Reset Security Key
                </h3>
              </div>
              <div className="w-10 h-3 rounded chassis-vent border border-black/30" />
            </div>

            {devToken ? (
              <div className="flex flex-col gap-4">
                <div className="panel-screen rounded p-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-bold">DEV ENVIRONMENT TOKEN DISPATCHED:</span>
                  </div>
                  <div className="bg-[#161a1d] p-2.5 rounded border border-[#3b4347] select-all text-accent font-bold break-all">
                    {devToken}
                  </div>
                  <p className="text-[#9aa3a8] mt-2 text-[11px]">
                    Use this token on the recovery terminal to assign a new password.
                  </p>
                </div>

                <Button
                  variant="raised"
                  indicator="orange"
                  onClick={() => navigate(`/reset-password?token=${devToken}`)}
                  className="w-full"
                >
                  PROCEED TO RE-KEY TERMINAL
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="font-mono text-xs text-[#55636c]">
                  Enter your registered operator email. The central telemetry engine will generate recovery tokens.
                </p>

                <Input
                  label="OPERATOR EMAIL"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@brightloop.com"
                  icon={Mail}
                  required
                />

                <Button
                  type="submit"
                  variant="raised"
                  indicator="orange"
                  loading={loading}
                  className="w-full py-2.5 uppercase font-bold"
                >
                  REQUEST RECOVERY TOKEN
                </Button>
              </form>
            )}

            <div className="pt-4 mt-4 border-t border-[#b6bec2] flex justify-center">
              <Link
                to="/login"
                className="font-mono text-xs text-[#55636c] hover:text-[#181e22] flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to operator console
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
