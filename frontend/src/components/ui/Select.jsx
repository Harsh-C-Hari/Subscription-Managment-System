import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Industrial Recessed Selector
 */
export function Select({
  label,
  error,
  hint,
  options = [],
  children,
  className = '',
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={selectId} className="engraved-label cursor-pointer flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-label/40" />
            {label}
          </label>
          {hint && <span className="font-mono text-[11px] text-[#55636c]">{hint}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        <select
          id={selectId}
          className={`w-full bg-[#f4f6f7] text-[#181e22] font-mono text-sm pl-3 pr-9 py-2 rounded-key border transition-colors shadow-well appearance-none cursor-pointer focus:bg-white focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
            error ? 'border-accent bg-[#fff5f2]' : 'border-[#9aa3a8]'
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        <div className="absolute right-3 pointer-events-none text-[#55636c]">
          <ChevronDown className="w-4 h-4" />
        </div>
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

export default Select;
