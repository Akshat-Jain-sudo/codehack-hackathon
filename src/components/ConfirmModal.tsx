import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  variant = 'warning',
  children,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    danger: <XCircle className="w-5 h-5 text-[#854D0E]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#854D0E]" />,
    success: <CheckCircle className="w-5 h-5 text-[#183D30]" />,
    info: <Info className="w-5 h-5 text-[#183D30]" />,
  };

  const buttonStyleMap = {
    danger: 'bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7]',
    warning: 'bg-[#854D0E] hover:bg-[#6b3e0b] text-[#FCFBF7]',
    success: 'bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E]',
    info: 'bg-[#183D30] hover:bg-[#204e3e] text-[#D8FF3E]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252722]/70 backdrop-blur-xs font-mono text-xs">
      <div 
        className="bg-[#FCFBF7] border border-[#DCD9CF] max-w-md w-full overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#DCD9CF] pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#F3F0E8] border border-[#DCD9CF] shrink-0">
                {iconMap[variant]}
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#7E8276] block font-bold">SYSTEM CONFIRMATION</span>
                <h3 className="font-display font-bold text-base text-[#252722]">{title}</h3>
                <p className="mt-1 text-xs font-sans text-[#565950] leading-relaxed">{message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#7E8276] hover:text-[#252722] p-1 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {children && <div className="mt-4">{children}</div>}

          <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[#DCD9CF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase text-[#252722] bg-[#F3F0E8] border border-[#DCD9CF] hover:bg-[#DCD9CF] cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-5 py-2 text-xs font-bold uppercase cursor-pointer ${buttonStyleMap[variant]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
