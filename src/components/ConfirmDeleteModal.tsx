import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  itemLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Confirmar Exclusão',
  description = 'Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.',
  itemLabel,
  confirmLabel = 'Sim, Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="confirm-delete-modal-title"
                className="text-base font-extrabold text-slate-900 dark:text-white"
              >
                {title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Confirmação de segurança para evitar exclusão acidental
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] p-4">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>
          {itemLabel && (
            <div className="mt-2.5 rounded-xl bg-white dark:bg-[#14171F] px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white border border-slate-200/70 dark:border-slate-800">
              {itemLabel}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            data-testid="btn-cancel-delete"
            className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="btn-confirm-delete"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-rose-500 transition-colors shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
