import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { Button, Input, useToast } from '../../components/ui';
import { Lock, ArrowLeft, KeyRound } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New security key must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Security key confirmation does not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      toast.success('Security key updated successfully. Please authenticate.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Password reset failed');
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
                  SECURITY RECOVERY // ASSIGN KEY
                </span>
                <h3 className="font-sans font-bold text-xl text-[#181e22] tracking-tight">
                  Assign New Security Key
                </h3>
              </div>
              <div className="w-10 h-3 rounded chassis-vent border border-black/30" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="RECOVERY TOKEN"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token received"
                icon={KeyRound}
                required
              />

              <Input
                label="NEW SECURITY KEY (MIN 8 CHARS)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                icon={Lock}
                required
              />

              <Input
                label="CONFIRM NEW SECURITY KEY"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                icon={Lock}
                required
              />

              <Button
                type="submit"
                variant="raised"
                indicator="orange"
                loading={loading}
                className="w-full py-2.5 uppercase font-bold"
              >
                APPLY NEW SECURITY KEY
              </Button>
            </form>

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

export default ResetPasswordPage;
