import React from 'react';

/**
 * Industrial Housing Chassis Panel
 */
export function Card({
  title,
  subtitle,
  bayNumber,
  variant = 'chassis', // 'chassis' | 'raised' | 'well' | 'screen'
  action,
  screws = true,
  vents = false,
  children,
  className = '',
}) {
  const variantStyles = {
    chassis: 'bg-[#cbd0d2] border-2 border-[#9ba5aa] text-[#181e22]',
    raised: 'bg-[#e7eaeb] border border-[#c2c9cc] shadow-raised text-[#181e22]',
    well: 'panel-well text-[#181e22]',
    screen: 'panel-screen text-[#f2f4f4]',
  }[variant] || 'bg-[#cbd0d2] border border-[#9ba5aa]';

  return (
    <div className={`relative rounded-lg p-1 ${variantStyles} ${className}`}>
      {/* Inner Bezel */}
      <div className="relative rounded-md border border-white/40 p-4 sm:p-5 h-full flex flex-col">
        {/* Optional Corner Screws */}
        {screws && variant === 'chassis' && (
          <>
            <span className="screw-head absolute top-2 left-2 pointer-events-none" />
            <span className="screw-head absolute top-2 right-2 pointer-events-none" />
            <span className="screw-head absolute bottom-2 left-2 pointer-events-none" />
            <span className="screw-head absolute bottom-2 right-2 pointer-events-none" />
          </>
        )}

        {/* Card Header */}
        {(title || bayNumber || action) && (
          <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-[#9ba5aa]/40">
            <div>
              {bayNumber && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className={variant === 'screen' ? 'engraved-label-dark text-[10px]' : 'engraved-label text-[10px]'}>
                    {bayNumber}
                  </span>
                </div>
              )}
              {title && (
                <h4 className={`font-sans font-bold text-lg tracking-tight ${variant === 'screen' ? 'text-white' : 'text-[#181e22]'}`}>
                  {title}
                </h4>
              )}
              {subtitle && (
                <p className={`font-mono text-xs mt-0.5 ${variant === 'screen' ? 'text-[#d8dee1]' : 'text-[#55636c]'}`}>
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {vents && (
                <div className="hidden sm:block w-12 h-4 rounded-sm chassis-vent border border-black/30" />
              )}
              {action && <div>{action}</div>}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export default Card;
