import React, { useEffect } from 'react';
import {
  BarChart3,
  Calculator,
  ChevronRight,
  Disc,
  FolderKanban,
  LogOut,
  Moon,
  Sun,
  Tags,
  Wallet,
  X,
} from 'lucide-react';
import { AppAccount } from './AuthView';
import { formatCurrencyBRL, PRINTMAIS_PLANS } from '../utils/pricing';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveScreen =
  | 'calculator'
  | 'products'
  | 'orders'
  | 'cashflow'
  | 'inventory'
  | 'reports';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: ActiveScreen;
  onSelectScreen: (screen: ActiveScreen) => void;
  account: AppAccount;
  totalCashBalance: number;
  productsCount: number;
  spoolsCount: number;
  quotesCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onRequestLogout: () => void;
}

export const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
  account,
  totalCashBalance,
  productsCount,
  spoolsCount,
  quotesCount,
  isDark,
  onToggleTheme,
  onRequestLogout,
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const planName =
    PRINTMAIS_PLANS.find((p) => p.id === account.plan)?.name || 'Plano Pro Anual';

  const menuSections = [
    {
      id: 'calculator' as ActiveScreen,
      label: 'Calculadora de Preço',
      description: 'Depreciação, energia kWh, falha e margem',
      icon: Calculator,
      badge: null,
    },
    {
      id: 'products' as ActiveScreen,
      label: 'Produtos & Categorias',
      description: 'Catálogo próprio, fotos, peso e custos',
      icon: Tags,
      badge: `${productsCount} itens`,
    },
    {
      id: 'orders' as ActiveScreen,
      label: 'Orçamentos & Pedidos',
      description: 'PDF, texto WhatsApp e fechamento',
      icon: FolderKanban,
      badge: `${quotesCount} orçamentos`,
    },
    {
      id: 'cashflow' as ActiveScreen,
      label: 'Fluxo de Caixa',
      description: 'Lançamentos, entradas e saídas da oficina',
      icon: Wallet,
      badge: formatCurrencyBRL(totalCashBalance),
    },
    {
      id: 'inventory' as ActiveScreen,
      label: 'Estoque de Bobinas & Resinas',
      description: 'Controle em gramas e alerta de reposição',
      icon: Disc,
      badge: `${spoolsCount} materiais`,
    },
    {
      id: 'reports' as ActiveScreen,
      label: 'Dashboard & Relatórios',
      description: 'Tendência mensal, faturamento e consumo',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex w-full max-w-xs sm:max-w-sm flex-col justify-between border-l border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#11131A] p-5 shadow-2xl transition-transform overflow-y-auto">
        <div>
          {/* Top Bar with Brand & Close Button */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-xl bg-[#1D63FF] p-1.5 text-white shadow-sm">
                <span className="rounded-full bg-white" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-full bg-white" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  PrintMais
                </span>
                <span className="block text-[10px] font-bold text-[#1D63FF]">
                  Menu Lateral
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu lateral"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User Account Card */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#161923] p-3.5 border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate max-w-[160px]">
                {account.displayName}
              </span>
              <span className="rounded-full bg-[#1D63FF]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#1D63FF] dark:text-blue-400">
                {planName}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {account.email}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 dark:bg-[#161923] p-2 text-center border border-slate-200/50 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Caixa</div>
              <div className="mt-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrencyBRL(totalCashBalance).replace('R$', '').trim()}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#161923] p-2 text-center border border-slate-200/50 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Produtos</div>
              <div className="mt-0.5 text-xs font-mono font-bold text-[#1D63FF] dark:text-blue-400">
                {productsCount} un
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#161923] p-2 text-center border border-slate-200/50 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Bobinas</div>
              <div className="mt-0.5 text-xs font-mono font-bold text-slate-900 dark:text-white">
                {spoolsCount} un
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navegação Mobile Completa" className="mt-5 space-y-1.5">
            <div className="pb-1 text-[11px] font-bold tracking-wider text-slate-400">
              PÁGINAS DO SISTEMA
            </div>
            {menuSections.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectScreen(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-all ${
                    isActive
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-md'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      <div
                        className={`text-[10px] truncate ${
                          isActive
                            ? 'text-white/80'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-100 dark:bg-[#161923] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-4">
            <PWAInstallButton variant="mobile-drawer" />
          </div>
        </div>

        {/* Bottom Actions: Theme Switcher & Logout */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161923] px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1D63FF] transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}</span>
            </span>
            <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono">
              {isDark ? 'Escuro' : 'Claro'}
            </span>
          </button>

          {/* Logout Button (triggers Confirmation Modal) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestLogout();
            }}
            data-testid="drawer-btn-logout"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-3.5 py-2.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
