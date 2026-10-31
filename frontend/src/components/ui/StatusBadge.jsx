import React from 'react';

/**
 * Industrial Status Lamp & Engraved Pill Badge
 * Supports all subscription & invoice states per contract
 */
export function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase().trim();

  // Status mapping to LED lamp and text label
  const config = {
    // Active / Positive states
    active: { label: 'ACTIVE', led: 'led-green', bg: 'bg-[#e2f5ec]', border: 'border-[#10b981]/50', text: 'text-[#065f46]' },
    paid: { label: 'PAID', led: 'led-green', bg: 'bg-[#e2f5ec]', border: 'border-[#10b981]/50', text: 'text-[#065f46]' },
    confirmed: { label: 'CONFIRMED', led: 'led-green', bg: 'bg-[#e2f5ec]', border: 'border-[#10b981]/50', text: 'text-[#065f46]' },

    // In-progress / Pending / Warning states
    quotation: { label: 'QUOTATION', led: 'led-amber', bg: 'bg-[#fef3c7]', border: 'border-[#f59e0b]/50', text: 'text-[#92400e]' },
    pending: { label: 'PENDING', led: 'led-amber', bg: 'bg-[#fef3c7]', border: 'border-[#f59e0b]/50', text: 'text-[#92400e]' },
    partially_paid: { label: 'PARTIALLY PAID', led: 'led-amber', bg: 'bg-[#fef3c7]', border: 'border-[#f59e0b]/50', text: 'text-[#92400e]' },
    paused: { label: 'PAUSED', led: 'led-orange', bg: 'bg-[#ffedd5]', border: 'border-[#f15b22]/50', text: 'text-[#9a3412]' },

    // Attention / Overdue states
    overdue: { label: 'OVERDUE', led: 'led-orange', bg: 'bg-[#fee2e2]', border: 'border-[#ef4444]/60', text: 'text-[#991b1b]' },

    // Inactive / Terminal / Draft states
    draft: { label: 'DRAFT', led: 'led-off', bg: 'bg-[#e7eaeb]', border: 'border-[#9aa3a8]', text: 'text-[#414b52]' },
    closed: { label: 'CLOSED', led: 'led-off', bg: 'bg-[#d8dee1]', border: 'border-[#9aa3a8]', text: 'text-[#414b52]' },
    cancelled: { label: 'CANCELLED', led: 'led-off', bg: 'bg-[#e5e7eb]', border: 'border-[#9ca3af]', text: 'text-[#4b5563]' },
    void: { label: 'VOID', led: 'led-off', bg: 'bg-[#e5e7eb]', border: 'border-[#9ca3af]', text: 'text-[#4b5563]' },
    inactive: { label: 'INACTIVE', led: 'led-off', bg: 'bg-[#e5e7eb]', border: 'border-[#9ca3af]', text: 'text-[#4b5563]' },
  }[normalized] || {
    label: normalized.toUpperCase().replace(/_/g, ' '),
    led: 'led-off',
    bg: 'bg-[#e7eaeb]',
    border: 'border-[#9aa3a8]',
    text: 'text-[#414b52]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-key font-mono text-[11px] font-bold tracking-wider border shadow-sm ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <span className={`led-lamp ${config.led}`} />
      <span>{config.label}</span>
    </span>
  );
}

export default StatusBadge;
