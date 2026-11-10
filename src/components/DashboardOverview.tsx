import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { QuoteRecord, SpoolRecord, TransactionRecord } from '../types';
import {
  computeMonthlyOverviewTrends,
  formatCurrencyBRL,
} from '../utils/pricing';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Disc,
  FolderKanban,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface DashboardOverviewProps {
  transactions: TransactionRecord[];
  quotes: QuoteRecord[];
  spools: SpoolRecord[];
  onNavigateToCashflow?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToInventory?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  transactions,
  quotes,
  spools,
  onNavigateToCashflow,
  onNavigateToOrders,
  onNavigateToInventory,
}) => {
  const metrics = computeMonthlyOverviewTrends(transactions, quotes, spools);

  const kgConsumed = (metrics.totalFilamentGramsConsumed / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <section
      aria-label="Visão Geral Inicial do Dashboard"
      className="space-y-4"
    >
      {/* Title bar with quick subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1D63FF] text-white shadow-sm shadow-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Visão Geral do Negócio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Métricas essenciais em tempo real com curva de tendência mensal consolidada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-[#181C26] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Dados Sincronizados
          </span>
        </div>
      </div>

      {/* 3 Main Overview Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* ======================================================== */}
        {/* CARD 1: SALDO TOTAL (Featured Card with High-Impact Style) */}
        {/* ======================================================== */}
        <div
          data-testid="card-saldo-total"
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-5 text-white shadow-xl border border-slate-800 dark:border-blue-400/30 transition-all hover:shadow-2xl"
        >
          <div>
            {/* Header: Label + Action Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 dark:bg-black/20 text-white backdrop-blur-sm">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-300 dark:text-blue-100 uppercase">
                  Saldo Total
                </span>
              </div>
              {onNavigateToCashflow && (
                <button
                  type="button"
                  onClick={onNavigateToCashflow}
                  aria-label="Ir para o Fluxo de Caixa"
                  title="Ver detalhes no Fluxo de Caixa"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 hover:bg-white text-white hover:text-slate-900 transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Numerical Balance Highlight */}
            <div className="mt-4">
              <div className="text-3xl font-extrabold tracking-tight tabular-nums text-white">
                {formatCurrencyBRL(metrics.totalBalance)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300 dark:text-blue-100 font-medium">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400 dark:text-emerald-200">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{formatCurrencyBRL(metrics.totalRevenue)}
                </span>
                <span>entradas</span>
                <span className="opacity-50">·</span>
                <span className="text-rose-300 dark:text-rose-100">
                  -{formatCurrencyBRL(metrics.totalExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Trend Sparkline Chart (Recharts) */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-blue-100 mb-1">
              <span>Tendência Mensal (Saldo)</span>
              <span className="tabular-nums font-mono">Jun — Nov</span>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.monthlyTrend}
                  margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900/95 border border-white/20 p-2.5 text-xs text-white shadow-xl backdrop-blur-md">
                            <div className="font-bold text-slate-300">{data.monthFull}</div>
                            <div className="mt-1 font-mono font-extrabold text-emerald-400">
                              Saldo: {formatCurrencyBRL(data.balance)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Receita: {formatCurrencyBRL(data.revenue)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientSaldo)"
                    dot={{ r: 2.5, fill: '#ffffff', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {onNavigateToCashflow && (
              <button
                type="button"
                onClick={onNavigateToCashflow}
                className="mt-2 flex w-full items-center justify-between rounded-xl bg-white/10 dark:bg-black/20 hover:bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white transition-colors"
              >
                <span>Extrato Completo & Despesas</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 2: ORÇAMENTOS PENDENTES */}
        {/* ======================================================== */}
        <div
          data-testid="card-orcamentos-pendentes"
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div>
            {/* Header: Label + Action Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Clock className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  Orçamentos Pendentes
                </span>
              </div>
              {onNavigateToOrders && (
                <button
                  type="button"
                  onClick={onNavigateToOrders}
                  aria-label="Ir para Orçamentos e Pedidos"
                  title="Ver todos os orçamentos"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-[#1D63FF] hover:text-[#1D63FF] transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Numerical Highlight */}
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {metrics.pendingQuotesCount}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {metrics.pendingQuotesCount === 1 ? 'proposta pendente' : 'propostas pendentes'}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono font-bold tabular-nums text-[#1D63FF]">
                  {formatCurrencyBRL(metrics.pendingQuotesValue)}
                </span>
                <span className="text-slate-500 dark:text-slate-400">em negociação</span>
              </div>

              {/* Status Pills */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#1A1E29] px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {metrics.draftQuotesCount} Rascunho{metrics.draftQuotesCount !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#1D63FF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D63FF]" />
                  {metrics.approvedQuotesCount} Aprovado{metrics.approvedQuotesCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Trend Bar Chart (Recharts) */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <span>Volume Mensal de Propostas</span>
              <span className="tabular-nums font-mono">Qtd / Mês</span>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.monthlyTrend}
                  margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white shadow-xl">
                            <div className="font-bold text-slate-300">{data.monthFull}</div>
                            <div className="mt-1 font-bold text-amber-400">
                              {data.pendingQuotesCount} {data.pendingQuotesCount === 1 ? 'proposta' : 'propostas'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Pipeline: {formatCurrencyBRL(data.pendingQuotesValue)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="pendingQuotesCount"
                    fill="#1D63FF"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {onNavigateToOrders && (
              <button
                type="button"
                onClick={onNavigateToOrders}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161923] hover:bg-slate-100 dark:hover:bg-slate-800/80 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Acessar Lista de Orçamentos</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 3: CONSUMO TOTAL DE FILAMENTO ATUAL */}
        {/* ======================================================== */}
        <div
          data-testid="card-consumo-filamento"
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div>
            {/* Header: Label + Action Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <Disc className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
                  Consumo de Filamento
                </span>
              </div>
              {onNavigateToInventory && (
                <button
                  type="button"
                  onClick={onNavigateToInventory}
                  aria-label="Ir para o Estoque de Bobinas"
                  title="Ver inventário de carretéis"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-[#1D63FF] hover:text-[#1D63FF] transition-colors"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Numerical Highlight */}
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {metrics.totalFilamentGramsConsumed.toLocaleString('pt-BR')}
                </span>
                <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                  gramas
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  ({kgConsumed} kg)
                </span>
              </div>

              {/* Stock status badge */}
              <div className="mt-2.5">
                {metrics.lowStockSpoolsCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {metrics.lowStockSpoolsCount} {metrics.lowStockSpoolsCount === 1 ? 'bobina com nível baixo' : 'bobinas com nível baixo'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Estoque estável ({metrics.activeSpoolsCount} bobinas cadastradas)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Trend Area Chart (Recharts) */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              <span>Tendência Mensal (Consumo)</span>
              <span className="tabular-nums font-mono">g / Mês</span>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.monthlyTrend}
                  margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradientFilamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white shadow-xl">
                            <div className="font-bold text-slate-300">{data.monthFull}</div>
                            <div className="mt-1 font-mono font-bold text-emerald-400">
                              {data.filamentGrams.toLocaleString('pt-BR')} g consumidas
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {(data.filamentGrams / 1000).toFixed(2)} kg de material
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="filamentGrams"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradientFilamento)"
                    dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {onNavigateToInventory && (
              <button
                type="button"
                onClick={onNavigateToInventory}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161923] hover:bg-slate-100 dark:hover:bg-slate-800/80 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Controlar Bobinas & Resinas</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
