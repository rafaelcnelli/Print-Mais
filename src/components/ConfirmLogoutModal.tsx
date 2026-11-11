import React from 'react';
import { LogOut, ShieldAlert, X } from 'lucide-react';
import { AppAccount } from './AuthView';
import { PRINTMAIS_PLANS } from '../utils/pricing';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  account: AppAccount;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({
  isOpen,
  account,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const planName =
    PRINTMAIS_PLANS.find((p) => p.id === account.plan)?.name || 'Plano Pro Anual';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-logout-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 dark:bg-amber-500/20">
              <LogOut className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="confirm-logout-title"
                className="text-base font-extrabold text-slate-900 dark:text-white"
              >
                Confirmar Saída da Conta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Você será redirecionado para a página inicial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar confirmação de logout"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account Info Box */}
        <div className="mt-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Usuário ativo</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {account.displayName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">E-mail</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {account.email}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
            <span className="text-xs text-slate-500 dark:text-slate-400">Assinatura</span>
            <span className="text-xs font-bold text-[#1D63FF] dark:text-blue-400">
              {planName}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-slate-600 dark:text-slate-300 border border-blue-200/60 dark:border-blue-900/40">
          <ShieldAlert className="h-4 w-4 text-[#1D63FF] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Seus orçamentos, produtos e histórico financeiro permanecerão salvos com segurança.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            data-testid="btn-cancel-logout"
            className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Permanecer Logado
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="btn-confirm-logout"
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-rose-500 transition-colors shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            Sim, Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
};
