import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * Industrial Instrument Hatch / Modal Enclosure
 */
export function Modal({
  isOpen,
  onClose,
  title,
  bayNumber = 'BAY DIALOG',
  children,
  maxWidth = 'max-w-xl',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Heavy Chassis Backdrop */}
      <div
        className="fixed inset-0 bg-[#20272b]/70 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Hardware Bay Housing */}
      <div
        className={`relative w-full ${maxWidth} bg-[#cbd0d2] rounded-lg border-2 border-[#9ba5aa] shadow-2xl p-1 z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Chassis Outer Bezel with corner screws */}
        <div className="relative rounded-md border border-[#ffffff]/60 bg-[#d8dde0] p-4 sm:p-6">
          {/* Corner Screws */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="screw-head" />
          </div>
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className="screw-head" />
          </div>
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <span className="screw-head" />
          </div>
          <div className="absolute bottom-2 right-2 pointer-events-none">
            <span className="screw-head" />
          </div>

          {/* Modal Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#b6bec2] mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="led-lamp led-orange" />
                <span className="engraved-label text-[10px] tracking-widest">{bayNumber}</span>
              </div>
              <h3 className="font-sans font-bold text-xl text-[#181e22] tracking-tight">
                {title}
              </h3>
            </div>

            <Button
              variant="raised"
              size="sm"
              onClick={onClose}
              aria-label="Close dialog"
              className="px-2 py-1"
            >
              <X className="w-4 h-4 text-[#414b52]" />
            </Button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[75vh] overflow-y-auto pr-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;

