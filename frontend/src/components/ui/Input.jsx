import React from 'react';

/**
 * Industrial Recessed Input Control
 */
export function Input({
  label,
  error,
  hint,
  icon: Icon,
  suffix,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="engraved-label cursor-pointer flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-label/40" />
            {label}
          </label>
          {hint && <span className="font-mono text-[11px] text-[#55636c]">{hint}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 pointer-events-none text-[#55636c] flex items-center">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          type={type}
          className={`w-full bg-[#f4f6f7] text-[#181e22] font-mono text-sm px-3 py-2 rounded-key border transition-colors shadow-well placeholder:text-[#84929a] focus:bg-white focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
            Icon ? 'pl-9' : ''
          } ${suffix ? 'pr-12' : ''} ${
            error ? 'border-accent bg-[#fff5f2]' : 'border-[#9aa3a8]'
          } ${className}`}
          {...props}
        />

        {suffix && (
          <div className="absolute right-2.5 pointer-events-none font-mono text-xs font-semibold text-[#55636c] bg-[#cbd0d2] px-1.5 py-0.5 rounded border border-[#9aa3a8]">
            {suffix}
          </div>
        )}
      </div>

      {error && (
        <p className="font-mono text-xs text-accent flex items-center gap-1 mt-0.5" role="alert">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
