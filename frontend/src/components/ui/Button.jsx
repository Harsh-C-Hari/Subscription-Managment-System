import React from 'react';

/**
 * Industrial Raised Key / Dial Action Button
 */
export function Button({
  children,
  variant = 'raised', // 'raised' | 'dial' | 'accent' | 'danger' | 'secondary' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  indicator = false, // boolean or 'orange' | 'green' | 'amber'
  isDial = false,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  // If isDial or variant is dial, render circular rotary button
  if (isDial || variant === 'dial') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        className={`action-dial relative group focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${className}`}
        {...props}
      >
        <div className="absolute inset-0.5 rounded-full border border-white/60 pointer-events-none" />
        {/* Subtle rotary tick mark */}
        <span className="absolute top-1 w-1 h-1.5 rounded-full bg-accent/90 shadow-sm" />
        <span className="font-mono text-xs font-bold text-ink group-hover:scale-105 transition-transform">
          {loading ? '...' : children}
        </span>
      </button>
    );
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs tracking-wider',
    md: 'px-4 py-2 text-sm font-semibold tracking-wide',
    lg: 'px-6 py-2.5 text-base font-semibold tracking-wide',
  }[size] || 'px-4 py-2 text-sm';

  const variantClasses = {
    raised: 'bg-[#e7eaeb] text-[#181e22] border border-[#c2c9cc] shadow-raised hover:shadow-raised-hover active:shadow-raised-active hover:-translate-y-0.5 active:translate-y-0.5',
    accent: 'bg-[#f15b22] text-white border border-[#d44813] shadow-raised hover:bg-[#e04f17] active:shadow-raised-active hover:-translate-y-0.5 active:translate-y-0.5',
    danger: 'bg-[#dc2626] text-white border border-[#b91c1c] shadow-raised hover:bg-[#b91c1c] active:shadow-raised-active hover:-translate-y-0.5 active:translate-y-0.5',
    secondary: 'bg-[#b6bec2] text-[#181e22] border border-[#9aa3a8] shadow-well active:shadow-raised-active',
    ghost: 'bg-transparent text-[#414b52] hover:bg-[#e7eaeb]/60 border border-transparent hover:border-[#c2c9cc]',
  }[variant] || variantClasses.raised;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-key font-sans select-none transition-all duration-key ease-settle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
      {...props}
    >
      {/* Optional LED Indicator Lamp on the Key */}
      {indicator && (
        <span
          className={`led-lamp ${
            indicator === 'green'
              ? 'led-green'
              : indicator === 'amber'
              ? 'led-amber'
              : 'led-orange'
          }`}
        />
      )}

      {loading ? (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          RUNNING...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;

