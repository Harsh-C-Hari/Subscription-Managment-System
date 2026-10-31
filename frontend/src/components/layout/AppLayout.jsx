import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavItemsForRole } from './navItems';
import { Button } from '../ui/Button';
import {
  LogOut,
  Menu,
  X,
  Gauge,
} from 'lucide-react';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Clock telemetry
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const items = getNavItemsForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#cbd0d2] text-[#181e22] flex flex-col p-2 sm:p-4 selection:bg-accent selection:text-white">
      {/* Outer Housing Chassis Frame */}
      <div className="flex-1 w-full max-w-[1580px] mx-auto rounded-xl border-4 border-[#9aa3a8] bg-[#cbd0d2] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Chassis Corner Rivets / Screws */}
        <div className="absolute top-2 left-2 z-30 pointer-events-none">
          <span className="screw-head" />
        </div>
        <div className="absolute top-2 right-2 z-30 pointer-events-none">
          <span className="screw-head" />
        </div>
        <div className="absolute bottom-2 left-2 z-30 pointer-events-none">
          <span className="screw-head" />
        </div>
        <div className="absolute bottom-2 right-2 z-30 pointer-events-none">
          <span className="screw-head" />
        </div>

        {/* Top Instrument Header Deck */}
        <header className="relative bg-[#d8dee1] border-b-2 border-[#9ba5aa] px-4 sm:px-6 py-3 flex items-center justify-between gap-4 z-20">
          {/* Brand & System Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded key-raised text-[#181e22]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#20272b] border border-[#161a1d] shadow-screen flex items-center justify-center text-accent">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="led-lamp led-green" />
                  <span className="font-sans font-extrabold text-lg sm:text-xl tracking-tight text-[#181e22]">
                    BRIGHTLOOP
                  </span>
                  <span className="font-mono text-[10px] bg-[#9aa3a8] text-[#181e22] px-1 py-0.2 rounded font-bold">
                    v2.4
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#55636c] uppercase tracking-wider flex items-center gap-2">
                  <span>SUBSCRIPTION TELEMETRY CHASSIS</span>
                  <span className="hidden sm:inline text-[#9aa3a8]">//</span>
                  <span className="hidden sm:inline font-mono">{currentTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Vent Louvers */}
          <div className="hidden xl:flex items-center gap-2">
            <div className="w-24 h-4 rounded chassis-vent border border-black/30" />
            <div className="w-24 h-4 rounded chassis-vent border border-black/30" />
          </div>

          {/* User Console & Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* User Profile readout */}
            <div className="hidden md:flex flex-col items-end">
              <span className="font-mono text-xs font-bold text-[#181e22]">
                {user?.full_name || user?.email}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <span className="led-lamp led-orange" />
                <span className="font-semibold text-accent uppercase tracking-wider">
                  ROLE: {user?.role || 'OPERATOR'}
                </span>
                {user?.company_name && (
                  <>
                    <span className="text-[#9aa3a8]">//</span>
                    <span className="text-[#55636c] truncate max-w-[140px]">
                      {user.company_name}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Rotary Quick Dial */}
            <Button
              isDial
              onClick={() => alert(`Instrument Console Diagnostics: ${user?.role?.toUpperCase()} mode online.`)}
              aria-label="Diagnostic Dial"
              title="Console Diagnostics"
            >
              DIAL
            </Button>

            {/* Logout Key */}
            <Button
              variant="raised"
              size="sm"
              onClick={handleLogout}
              className="text-xs uppercase tracking-wider font-mono flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-[#55636c]" />
              <span className="hidden sm:inline">DISCONNECT</span>
            </Button>
          </div>
        </header>

        {/* Chassis Body: Vertical Seam & Side Panel */}
        <div className="flex-1 flex flex-col lg:flex-row relative">
          {/* Navigation Bank Sidebar */}
          <aside
            className={`lg:w-64 shrink-0 bg-[#b6bec2] border-r-2 border-[#9aa3a8] p-3 flex flex-col gap-4 shadow-well transition-all z-10 ${
              mobileMenuOpen ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Bank Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#9aa3a8]/70">
              <span className="engraved-label text-[10px] tracking-widest text-[#414b52]">
                BANK 01 // NAVIGATION
              </span>
              <span className="led-lamp led-orange" />
            </div>

            {/* Raised Key Navigation Bank */}
            <nav className="flex flex-col gap-1.5 flex-1" aria-label="Main Navigation">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-key font-mono text-xs font-semibold tracking-wide border transition-all duration-key ease-settle ${
                      isActive
                        ? 'bg-[#20272b] text-white border-[#161a1d] shadow-screen translate-y-0.5'
                        : 'bg-[#e7eaeb] text-[#181e22] border-[#c2c9cc] shadow-raised hover:shadow-raised-hover hover:-translate-y-0.5 active:translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-accent' : 'text-[#55636c] group-hover:text-[#181e22]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono px-1 rounded ${
                          isActive
                            ? 'text-[#d8dee1] bg-black/40'
                            : 'text-[#55636c] bg-[#cbd0d2]'
                        }`}
                      >
                        {item.bay}
                      </span>
                      <span
                        className={`led-lamp ${
                          isActive ? 'led-orange' : 'led-off opacity-40'
                        }`}
                      />
                    </div>
                  </NavLink>
                );
              })}
            </nav>

            {/* Hardware System Status Gauge */}
            <div className="panel-screen rounded p-3 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-[#d8dee1] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="led-lamp led-green" />
                  CORE BUS
                </span>
                <span>SYNCED</span>
              </div>
              <div className="w-full bg-[#161a1d] h-2 rounded overflow-hidden border border-[#3b4347]">
                <div className="bg-accent h-full w-[88%] rounded-sm" />
              </div>
              <div className="flex justify-between font-mono text-[9px] text-[#9aa3a8]">
                <span>BUFFER: 88%</span>
                <span>LATENCY: 12ms</span>
              </div>
            </div>
          </aside>

          {/* Main Reading & Operating Bay */}
          <main className="flex-1 bg-[#cbd0d2] p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Pale Closing Bay Footer */}
        <footer className="bg-[#b6bec2] border-t-2 border-[#9aa3a8] px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#55636c]">
          <div className="flex items-center gap-3">
            <span className="screw-head !w-3 !h-3" />
            <span className="engraved-label text-[10px]">CHASSIS BAY 99 // BASE LEDGER</span>
            <span className="text-[#9aa3a8]">//</span>
            <span>SYSTEM ACTIVE &bull; ALL RIGHTS RESERVED</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hover:text-ink transition-colors cursor-pointer">
              DIAGNOSTICS
            </span>
            <span className="hover:text-ink transition-colors cursor-pointer">
              LEDGER VERIFICATION
            </span>
            <div className="w-12 h-3 rounded chassis-vent border border-black/30" />
            <span className="screw-head !w-3 !h-3" />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AppLayout;
