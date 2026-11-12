import React, { useMemo, useState } from 'react';
import { QuoteRecord, SaleRecord, SpoolRecord, TransactionRecord } from '../types';
import {
  calculate3DPrintPricing,
  calculateBreakeven,
  computeDashboardSummary,
  formatCurrencyBRL,
  simulateFarmExpansion,
} from '../utils/pricing';
import { computeSalesByChannelSummary } from '../utils/marketplaceHub';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Cpu,
  Gauge,
  Layers,
  Link2,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { DashboardOverview } from './DashboardOverview';

interface ReportsDashboardViewProps {
  quotes: QuoteRecord[];
  transactions: TransactionRecord[];
  spools: SpoolRecord[];
  sales?: SaleRecord[];
  onNavigateToCalculator: () => void;
  onNavigateToCashflow: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToIntegrations?: () => void;
}

function formatCompactBRL(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}K`;
  }
  return formatCurrencyBRL(value);
}

export const ReportsDashboardView: React.FC<ReportsDashboardViewProps> = ({
  quotes,
  transactions,
  spools,
  sales = [],
  onNavigateToCalculator,
  onNavigateToCashflow,
  onNavigateToOrders,
  onNavigateToInventory,
  onNavigateToIntegrations,
}) => {
  // Interactive state for Breakeven & Farm Expansion Simulator
  const [fixedMonthlyCosts, setFixedMonthlyCosts] = useState<number>(1450);
  const [simPrinters, setSimPrinters] = useState<number>(1);
  const [simHoursPerDay, setSimHoursPerDay] = useState<number>(14);
  const [simRevenuePerHour, setSimRevenuePerHour] = useState<number>(22);
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '12m'>('30d');

  const summary = useMemo(
    () => computeDashboardSummary(transactions, quotes, 720),
    [transactions, quotes]
  );

  const channelSummary = useMemo(
    () => computeSalesByChannelSummary(sales, transactions),
    [sales, transactions]
  );

  // Aggregate cost distribution across saved quotes (Material vs Energy vs Depreciation vs Labor)
  const costDistribution = useMemo(() => {
    let mat = 0;
    let eng = 0;
    let dep = 0;
    let lab = 0;
    let fail = 0;

    quotes.forEach((q) => {
      const b = calculate3DPrintPricing(q);
      mat += b.materialCostBatch;
      eng += b.energyCostBatch;
      dep += b.depreciationCostBatch;
      lab += b.laborCostBatch;
      fail += b.failureRiskCostBatch;
    });

    const total = Math.max(1, mat + eng + dep + lab + fail);
    return {
      total,
      items: [
        {
          label: 'Filamento & Resina',
          amount: mat,
          pct: Math.round((mat / total) * 100),
          patternClass: 'bg-hatch-blue',
          dotLevels: [3, 2, 3, 3, 2, 3, 2],
        },
        {
          label: 'Mão de Obra & Pós-Proc.',
          amount: lab,
          pct: Math.round((lab / total) * 100),
          patternClass: 'bg-hatch-navy',
          dotLevels: [2, 3, 1, 2, 3, 2, 3],
        },
        {
          label: 'Energia & Desgaste Máquina',
          amount: eng + dep,
          pct: Math.round(((eng + dep) / total) * 100),
          patternClass: 'bg-hatch-obsidian',
          dotLevels: [3, 2, 3, 2, 2, 1, 1],
        },
      ],
    };
  }, [quotes]);

  // Monthly Revenue vs Expenses series for the Fingoals Bar Chart
  const monthlySeries = useMemo(() => {
    const multiplier = selectedPeriod === '30d' ? 1 : selectedPeriod === '90d' ? 2.8 : 11.4;
    return [
      {
        label: 'Ago',
        revenue: Math.round(2480 * multiplier),
        expense: Math.round(1190 * multiplier),
        heightPct: 48,
        barClass: 'bg-hatch-obsidian',
      },
      {
        label: 'Set',
        revenue: Math.round(2150 * multiplier),
        expense: Math.round(1080 * multiplier),
        heightPct: 36,
        barClass: 'bg-hatch-navy',
      },
      {
        label: 'Out (Pico)',
        revenue: Math.round(summary.totalRevenue * multiplier),
        expense: Math.round(summary.totalExpenses * multiplier),
        heightPct: 92,
        barClass: 'bg-hatch-blue',
        isPeak: true,
      },
      {
        label: 'Projeção 30d',
        revenue: Math.round(summary.projectedNext30DaysRevenue * multiplier),
        expense: Math.round(summary.totalExpenses * 1.05 * multiplier),
        heightPct: 74,
        barClass: 'bg-hatch-sky',
      },
    ];
  }, [summary, selectedPeriod]);

  // Profit by Category / Technology
  const categoryProfitability = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; profit: number; count: number }> = {
      lote_producao: { name: 'Lotes Seriados B2B', revenue: 0, profit: 0, count: 0 },
      miniatura: { name: 'Action Figures & Colecionáveis SLA', revenue: 0, profit: 0, count: 0 },
      peca_tecnica: { name: 'Peças Técnicas & Reposição', revenue: 0, profit: 0, count: 0 },
      chaveiro: { name: 'Brindes & Chaveiros NFC', revenue: 0, profit: 0, count: 0 },
    };

    quotes.forEach((q) => {
      const bucket = map[q.presetId] || map.peca_tecnica;
      bucket.revenue += q.totalPrice;
      bucket.profit += q.netProfit;
      bucket.count += 1;
    });

    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [quotes]);

  const breakeven = useMemo(
    () =>
      calculateBreakeven(
        fixedMonthlyCosts,
        summary.totalRevenue,
        summary.averageMarginPracticed || 100
      ),
    [fixedMonthlyCosts, summary.totalRevenue, summary.averageMarginPracticed]
  );

  const farmSim = useMemo(
    () =>
      simulateFarmExpansion({
        additionalPrinters: simPrinters,
        hoursPerDay: simHoursPerDay,
        daysPerMonth: 26,
        revenuePerMachineHour: simRevenuePerHour,
        costPerMachineHour: 7.5,
        printerUnitCost: 4200,
      }),
    [simPrinters, simHoursPerDay, simRevenuePerHour]
  );

  // Gauge segments (20 segments like Fingoals Financial Balance gauge)
  const totalGaugeSegments = 20;
  const activeGaugeSegments = Math.max(
    2,
    Math.min(
      totalGaugeSegments,
      Math.round((summary.utilizationPercent / 100) * totalGaugeSegments)
    )
  );

  return (
    <div className="space-y-7">
      {/* INITIAL OVERVIEW CARDS WITH RECHARTS MONTHLY TRENDS */}
      <DashboardOverview
        transactions={transactions}
        quotes={quotes}
        spools={spools}
        onNavigateToCashflow={onNavigateToCashflow}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToInventory={onNavigateToInventory}
      />

      <div className="h-px w-full bg-slate-200/80 dark:bg-slate-800/80" />

      {/* Header Overview Bar matching Fingoals Reference */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Performance Detalhada & Fazenda 3D
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Indicadores de Lucro Líquido, Ponto de Equilíbrio & Simulador de Escala
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-1">
            {(['30d', '90d', '12m'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  selectedPeriod === period
                    ? 'bg-[#1D63FF] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period === '30d' ? '30 Dias' : period === '90d' ? 'Trimestre' : '12 Meses'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Key KPIs Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Faturamento Bruto Mensal</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[#1D63FF]">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatCurrencyBRL(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            +24,8% vs. ciclo anterior
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Lucro Líquido Real</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBRL(summary.netProfit)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Descontando filamento, energia e peças
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Horas Rodadas vs. Ociosas</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[#1D63FF]">
              <Cpu className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {summary.totalMachineHoursUsed}h{' '}
            <span className="text-sm font-normal text-slate-400">
              / {summary.idleHours}h livres
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Taxa de ocupação: <strong className="tabular-nums text-[#1D63FF]">{summary.utilizationPercent}%</strong>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Margem Média Praticada</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {summary.averageMarginPracticed}%
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Média ponderada dos orçamentos ativos
          </div>
        </div>
      </div>

      {/* VENDAS POR CANAL (Venda Direta / WhatsApp vs. Shopee vs. Mercado Livre) */}
      <section
        aria-label="Vendas por Canal: Venda Direta vs. Shopee vs. Mercado Livre"
        data-testid="dashboard-sales-by-channel"
        className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D63FF]/10 text-[#1D63FF]">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Vendas por Canal (Venda Direta vs. Shopee vs. Mercado Livre)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparativo de Faturamento Bruto, Taxas Pagas aos Marketplaces e Lucro Líquido Real por canal de venda
              </p>
            </div>
          </div>

          {onNavigateToIntegrations && (
            <button
              type="button"
              onClick={onNavigateToIntegrations}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors cursor-pointer"
            >
              <span>🔗 Ir para Hub de Integrações</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#1D63FF]" />
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {channelSummary.channels.map((ch) => {
            const styleMeta =
              ch.channelKey === 'direta'
                ? {
                    badge: '🟢 Venda Direta / WhatsApp',
                    borderClass: 'border-emerald-500/30',
                    barColor: 'bg-emerald-500',
                    textAccent: 'text-emerald-600 dark:text-emerald-400',
                  }
                : ch.channelKey === 'mercado_livre'
                ? {
                    badge: '🟡 Mercado Livre',
                    borderClass: 'border-amber-500/30',
                    barColor: 'bg-amber-400',
                    textAccent: 'text-amber-600 dark:text-amber-400',
                  }
                : {
                    badge: '🟠 Shopee',
                    borderClass: 'border-orange-500/30',
                    barColor: 'bg-orange-500',
                    textAccent: 'text-orange-600 dark:text-orange-400',
                  };

            const sharePct = Math.round(ch.shareOfGrossPercent);
            const netRetentionPct =
              ch.grossRevenue > 0
                ? Math.round((ch.netRevenue / ch.grossRevenue) * 100)
                : 100;

            return (
              <div
                key={ch.channelKey}
                data-testid={`channel-card-${ch.channelKey}`}
                className={`rounded-2xl border ${styleMeta.borderClass} bg-slate-50/70 dark:bg-[#0D0F14] p-4 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {styleMeta.badge}
                    </span>
                    <span className="rounded-full bg-slate-200/70 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {ch.ordersCount} {ch.ordersCount === 1 ? 'pedido' : 'pedidos'} ({sharePct}%)
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-y border-slate-200/70 dark:border-slate-800/80 py-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Fatur. Bruto
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrencyBRL(ch.grossRevenue)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Taxas Pagas
                      </div>
                      <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-rose-500">
                        -{formatCurrencyBRL(ch.marketplaceFees)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Líquido Real
                      </div>
                      <div className={`mt-0.5 font-mono text-xs font-extrabold tabular-nums ${styleMeta.textAccent}`}>
                        {formatCurrencyBRL(ch.netProfit)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Repasse Líquido ({netRetentionPct}%)</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {formatCurrencyBRL(ch.netRevenue)} recebidos
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      style={{ width: `${Math.max(6, sharePct)}%` }}
                      className={`h-full rounded-full ${styleMeta.barColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BENTO GRID ROW 1 (Inspired directly by image.png Fingoals layout) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card (6 cols): Distribuição & Matriz de Custos (Dot-Matrix style from image.png) */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Distribuição de Custos Operacionais
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filamento vs. Mão de Obra vs. Energia & Depreciação
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToCashflow}
              aria-label="Ver detalhes de custos no Fluxo de Caixa"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-[#1D63FF] hover:text-[#1D63FF] transition-colors"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
            <div className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
              {formatCurrencyBRL(costDistribution.total)}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1D63FF]" /> Alto Impacto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#102A6B]" /> Moderado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Baixo
              </span>
            </div>
          </div>

          {/* Fingoals Dot-Matrix Visualization + Percentage Breakdown */}
          <div className="mt-6 space-y-4">
            {costDistribution.items.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-12 items-center gap-3"
              >
                <div className="col-span-5 sm:col-span-4">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatCurrencyBRL(item.amount)} ({item.pct}%)
                  </div>
                </div>

                <div className="col-span-7 sm:col-span-8 flex items-center justify-between gap-2">
                  {item.dotLevels.map((lvl, idx) => (
                    <div
                      key={idx}
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-transform hover:scale-105 ${
                        lvl === 3
                          ? 'bg-hatch-blue'
                          : lvl === 2
                          ? 'bg-hatch-navy'
                          : 'bg-slate-200/80 dark:bg-slate-800/80'
                      }`}
                      title={`${item.label} — Dia ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 pt-1 text-center text-[11px] font-semibold text-slate-400">
              <div className="col-span-5 sm:col-span-4 text-left">Ciclo Semanal</div>
              <div className="col-span-7 sm:col-span-8 flex justify-between px-2">
                <span>D</span>
                <span>S</span>
                <span>T</span>
                <span>Q</span>
                <span>Q</span>
                <span>S</span>
                <span>S</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Cluster (6 cols): Dark Promo Banner + Today Projected + Quick Report Card */}
        <div className="flex flex-col justify-between gap-5 lg:col-span-6">
          {/* Top Highlight Banner: Blue in Dark Mode, Black in Light Mode */}
          <div className="relative overflow-hidden rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] border border-slate-800 dark:border-blue-400/30 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-sm">
                <span className="text-xs font-bold text-blue-400 dark:text-blue-100">
                  Previsão Baseada nos Últimos 30 Dias
                </span>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight">
                  Ritmo Projetado:{' '}
                  <span className="tabular-nums text-white underline decoration-white/40">
                    {formatCurrencyBRL(summary.projectedNext30DaysRevenue)}
                  </span>
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 dark:text-blue-100">
                  Considerando pedidos faturados + pipeline de orçamentos aprovados para os próximos 30 dias.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToCalculator}
                className="inline-flex items-center gap-2 rounded-full bg-[#1D63FF] dark:bg-[#0D0F14] px-5 py-2.5 text-xs font-extrabold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 shadow-md"
              >
                Novo Orçamento
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom 2 Bento Sub-cards matching image.png */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Breakeven Status Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <ArrowDownRight className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Ponto de Equilíbrio (Breakeven)
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrencyBRL(breakeven.breakevenRevenue)}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Meta mínima p/ cobrir custos fixos de{' '}
                  <strong className="tabular-nums">{formatCurrencyBRL(fixedMonthlyCosts)}</strong>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label
                  htmlFor="input-fixed-costs"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Custo Fixo Oficina (R$):
                </label>
                <input
                  id="input-fixed-costs"
                  type="number"
                  min={100}
                  step={50}
                  value={fixedMonthlyCosts}
                  onChange={(e) => setFixedMonthlyCosts(Number(e.target.value) || 0)}
                  className="w-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Status do Breakeven Card (Blue in Dark Mode, Black in Light Mode) */}
            <div className="flex flex-col justify-between rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] border border-slate-800 dark:border-blue-400/30 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300 dark:text-blue-100">
                  Status do Breakeven
                </span>
                <button
                  type="button"
                  onClick={onNavigateToCashflow}
                  aria-label="Ir para o Fluxo de Caixa"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 hover:bg-blue-50 transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              <div className="my-3">
                <div className="text-xs text-slate-300 dark:text-blue-100">Cobertura da Meta Mensal</div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">
                  {breakeven.breakevenProgressPercent}% Atingido
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800 dark:bg-[#0D0F14]/50">
                  <div
                    style={{ width: `${breakeven.breakevenProgressPercent}%` }}
                    className="bg-hatch-sky dark:bg-white h-full rounded-full"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-300 dark:text-blue-100">
                {breakeven.isAboveBreakeven
                  ? 'Oficina operando em zona de lucro líquido positivo!'
                  : `Faltam ${formatCurrencyBRL(breakeven.remainingToBreakeven)} para cobrir custos fixos.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BENTO GRID ROW 2: Faturamento x Despesas Bar Chart (8 cols) + Farm Utilization Gauge (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Faturamento x Despesas (Income Sources style from image.png) */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Faturamento vs. Despesas & Categorias Mais Lucrativas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evolução de receita bruta com textura diagonal e ranking de linhas de produto
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 items-end gap-6 md:grid-cols-12">
            {/* Left Metric Callout + Category Ranking */}
            <div className="space-y-4 md:col-span-5">
              <div>
                <span className="inline-block rounded-full bg-slate-900 dark:bg-white px-3 py-1 text-xs font-bold text-white dark:text-slate-900 tabular-nums">
                  Ciclo {selectedPeriod}
                </span>
                <div className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {formatCurrencyBRL(summary.totalRevenue)}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Receita consolidada vs. {formatCurrencyBRL(summary.totalExpenses)} em despesas
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-200/70 dark:border-slate-800 pt-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Produtos / Categorias Mais Lucrativos
                </div>
                {categoryProfitability.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-slate-600 dark:text-slate-400">
                      {cat.name}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      +{formatCurrencyBRL(cat.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Bar Chart with Diagonal Stripes (matching image.png) */}
            <div className="md:col-span-7">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold tabular-nums text-[#1D63FF]">
                    +73,6%
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    margem operacional saudável
                  </span>
                </div>
              </div>

              <div className="grid h-52 grid-cols-4 items-end gap-3 pt-6">
                {monthlySeries.map((bar) => (
                  <div
                    key={bar.label}
                    className="flex h-full flex-col justify-end"
                  >
                    <div
                      style={{ height: `${bar.heightPct}%` }}
                      className={`relative flex w-full flex-col justify-between rounded-2xl p-2.5 text-white transition-all duration-300 ${bar.barClass}`}
                    >
                      <span className="inline-flex items-center justify-center rounded-lg bg-white/95 px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums text-slate-900 shadow-sm whitespace-nowrap">
                        ↗ {formatCompactBRL(bar.revenue)}
                      </span>
                      <span className="text-[10px] font-medium text-white/85 tabular-nums whitespace-nowrap">
                        -{formatCompactBRL(bar.expense)}
                      </span>
                    </div>
                    <div className="mt-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {bar.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Gauge Card (4 cols): Utilização da Fazenda (matching Financial Balance gauge in image.png) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Taxa de Utilização da Fazenda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Horas produtivas vs. capacidade instalada
              </p>
            </div>
            <Gauge className="h-5 w-5 text-[#1D63FF]" />
          </div>

          {/* Segmented Semi-Circle Bar Visual */}
          <div className="my-6 flex flex-col items-center">
            <div className="flex items-end justify-center gap-1.5">
              {Array.from({ length: totalGaugeSegments }).map((_, idx) => {
                const isActive = idx < activeGaugeSegments;
                return (
                  <div
                    key={idx}
                    className={`w-2.5 rounded-full transition-all ${
                      isActive
                        ? 'bg-[#1D63FF] h-12'
                        : 'bg-slate-200 dark:bg-slate-800 h-8'
                    }`}
                  />
                );
              })}
            </div>

            <div className="mt-4 text-center">
              <div className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {summary.utilizationPercent}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {summary.totalMachineHoursUsed}h ativas de 720h mensais
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-300">
            Capacidade ociosa disponível:{' '}
            <strong className="tabular-nums text-[#1D63FF]">
              {summary.idleHours} horas/mês
            </strong>
          </div>
        </div>
      </div>

      {/* BENTO GRID ROW 3: Print Farm Expansion Simulator ("Se eu comprar mais X impressoras...") */}
      <section
        aria-label="Simulador de Expansão da Fazenda de Impressão 3D"
        className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D63FF] text-white">
              <Sliders className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Simulador de Escala: "E se eu comprar mais impressoras?"
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simule o impacto no faturamento mensal e o tempo de retorno (payback) ao expandir sua fazenda 3D
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Sliders (7 cols) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sim-printers"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  + Impressoras Novas
                </label>
                <span className="text-lg font-extrabold tabular-nums text-[#1D63FF]">
                  +{simPrinters} {simPrinters === 1 ? 'máq.' : 'máqs.'}
                </span>
              </div>
              <input
                id="sim-printers"
                type="range"
                min={1}
                max={15}
                step={1}
                value={simPrinters}
                onChange={(e) => setSimPrinters(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer rounded-lg"
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
                <span>+1</span>
                <span>+5</span>
                <span>+15</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sim-hours"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Horas Rodando / Dia
                </label>
                <span className="text-lg font-extrabold tabular-nums text-[#1D63FF]">
                  {simHoursPerDay}h/dia
                </span>
              </div>
              <input
                id="sim-hours"
                type="range"
                min={4}
                max={24}
                step={1}
                value={simHoursPerDay}
                onChange={(e) => setSimHoursPerDay(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer rounded-lg"
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
                <span>4h</span>
                <span>14h</span>
                <span>24h (Full)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="sim-rev-hour"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Receita Média / Hora
                </label>
                <span className="text-lg font-extrabold tabular-nums text-emerald-500">
                  R$ {simRevenuePerHour}/h
                </span>
              </div>
              <input
                id="sim-rev-hour"
                type="range"
                min={10}
                max={60}
                step={2}
                value={simRevenuePerHour}
                onChange={(e) => setSimRevenuePerHour(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer rounded-lg"
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
                <span>R$ 10/h</span>
                <span>R$ 25/h</span>
                <span>R$ 60/h</span>
              </div>
            </div>
          </div>

          {/* Simulation Output Card (5 cols) */}
          <div className="rounded-3xl bg-[#0D0F14] border border-slate-800 p-5 text-white lg:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">
                  Faturamento Adicional / Mês
                </div>
                <div
                  data-testid="sim-potential-revenue"
                  className="mt-1 text-2xl font-extrabold tabular-nums text-white"
                >
                  +{formatCurrencyBRL(farmSim.potentialAdditionalRevenue)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                  +{farmSim.newMonthlyPrintHours} horas produtivas/mês
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">
                  Lucro Líquido Adicional / Mês
                </div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-400">
                  +{formatCurrencyBRL(farmSim.potentialAdditionalProfit)}
                </div>
                <div className="mt-1 text-[11px] text-blue-400 tabular-nums">
                  Payback estimado: {farmSim.estimatedPaybackMonths} meses
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
