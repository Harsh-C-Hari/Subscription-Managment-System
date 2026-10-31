import React from 'react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

/**
 * Industrial Empty Deck Display
 */
export function EmptyState({
  title = 'NO RECORDS FOUND',
  description = 'No active telemetry data matches the current parameters.',
  icon: Icon = AlertCircle,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`panel-well rounded-md p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}>
      <div className="w-14 h-14 rounded-full bg-[#cbd0d2] border border-[#9aa3a8] shadow-raised flex items-center justify-center mb-4 text-[#414b52]">
        <Icon className="w-7 h-7 text-[#55636c]" />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="led-lamp led-off" />
        <h4 className="engraved-label text-sm tracking-wider text-[#181e22]">
          {title}
        </h4>
      </div>

      <p className="font-mono text-xs text-[#55636c] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="raised" indicator="orange" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

