import React from 'react';

/**
 * Industrial Rotary Dial / Instrument Scanner
 */
export function Spinner({ size = 'md', label = 'PROCESSING TELEMETRY...', className = '' }) {
  const sizeMap = {
    sm: { dial: 'w-6 h-6', inner: 'w-4 h-4', text: 'text-[10px]' },
    md: { dial: 'w-10 h-10', inner: 'w-7 h-7', text: 'text-xs' },
    lg: { dial: 'w-16 h-16', inner: 'w-11 h-11', text: 'text-sm' },
  }[size] || { dial: 'w-10 h-10', inner: 'w-7 h-7', text: 'text-xs' };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      <div className={`relative ${sizeMap.dial} rounded-full border-2 border-[#8b969c] flex items-center justify-center bg-[#b6bec2] shadow-well animate-spin`}>
        {/* Outer tick marks */}
        <div className="absolute top-0.5 w-1 h-2 bg-accent rounded-full shadow-sm" />
        <div className="absolute bottom-0.5 w-1 h-1.5 bg-[#414b52] rounded-full" />
        <div className="absolute left-0.5 w-1.5 h-1 bg-[#414b52] rounded-full" />
        <div className="absolute right-0.5 w-1.5 h-1 bg-[#414b52] rounded-full" />

        {/* Center metallic hub */}
        <div className={`${sizeMap.inner} rounded-full bg-[#dbe0e3] border border-[#7a858b] shadow-dial flex items-center justify-center`}>
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        </div>
      </div>

      {label && (
        <span className={`engraved-label tracking-widest ${sizeMap.text} text-[#414b52] animate-pulse`}>
          {label}
        </span>
      )}
    </div>
  );
}

export default Spinner;

