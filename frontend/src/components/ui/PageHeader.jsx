import React from 'react';

/**
 * Industrial Housing Bay Opening Header
 */
export function PageHeader({
  bayNumber = 'BAY 01',
  title,
  subtitle,
  status = 'ONLINE',
  actions,
  dialAction,
}) {
  return (
    <div className="relative mb-6 pb-5 border-b-2 border-[#9ba5aa] bg-[#d5dbde] rounded-lg p-4 sm:p-6 shadow-sm border border-[#ffffff]/60">
      {/* Upper Status Bar & Seam */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#b6bec2]/60">
        <div className="flex items-center gap-2">
          <span className="screw-head !w-3 !h-3" />
          <span className="led-lamp led-orange" />
          <span className="engraved-label text-[11px] tracking-widest text-[#181e22]">
            {bayNumber}
          </span>
          <span className="text-[#9aa3a8] font-mono text-xs">//</span>
          <span className="font-mono text-[11px] font-semibold text-[#55636c] uppercase">
            STATUS: {status}
          </span>
        </div>

        {/* Decorative Vent Louvers */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-20 h-3.5 rounded chassis-vent border border-black/40" />
          <span className="screw-head !w-3 !h-3" />
        </div>
      </div>

      {/* Main Bay Heading & Control Assembly */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-4xl text-[#181e22] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="font-mono text-xs sm:text-sm text-[#55636c] mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Control Assembly (Dial + Raised Keys) */}
        {(actions || dialAction) && (
          <div className="flex items-center gap-3 self-start md:self-auto pt-2 md:pt-0">
            {dialAction && (
              <div className="flex items-center gap-2 pr-2 border-r border-[#9ba5aa]">
                {dialAction}
              </div>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
