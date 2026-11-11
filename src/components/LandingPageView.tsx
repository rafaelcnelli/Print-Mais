import React, { useMemo, useState } from 'react';
import { CalculatorParams } from '../types';
import {
  CALCULATOR_PRESETS,
  calculate3DPrintPricing,
  formatCurrencyBRL,
  PRINTMAIS_PLANS,
  SubscriptionPlanId,
} from '../utils/pricing';
import {
  ArrowRight,
  BarChart3,
  Box,
  Calculator,
  Check,
  Disc,
  FileText,
  FolderKanban,
  Layers,
  Lock,
  LogIn,
  Moon,
  PackagePlus,
  Percent,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface LandingPageViewProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAuth: (options?: {
    initialMode?: 'login' | 'register';
    selectedPlan?: SubscriptionPlanId;
  }) => void;
}

const INITIAL_DEMO_PARAMS: CalculatorParams = {
  clientName: 'Visitante Demo',
  projectName: 'Suporte Articulado Industrial PETG',
  technology: 'FDM',
  presetId: 'peca_tecnica',
  weightGrams: 95,
  filamentPricePerKg: 145,
  printTimeHours: 3,
  printTimeMinutes: 45,
  printerPowerWatts: 240,
  energyRateKwh: 0.92,
  printerCost: 4800,
  printerLifespanHours: 4000,
  laborHourlyRate: 45,
  laborHours: 0.4,
  batchQuantity: 1,
  profitMarginPercent: 95,
  failureRiskPercent: 10,
};

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  isDark,
  onToggleTheme,
  onOpenAuth,
}) => {
  const [demoParams, setDemoParams] = useState<CalculatorParams>(INITIAL_DEMO_PARAMS);
  const [demoLockedNotice, setDemoLockedNotice] = useState<string | null>(null);
  const [highlightedCycle, setHighlightedCycle] = useState<'all' | 'monthly' | 'annual'>('all');

  const breakdown = useMemo(() => calculate3DPrintPricing(demoParams), [demoParams]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = CALCULATOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDemoParams((prev) => ({
      ...prev,
      ...preset.params,
      presetId: preset.id,
    }));
  };

  const handleNumericChange = (field: keyof CalculatorParams, rawValue: string) => {
    const parsed = rawValue === '' ? 0 : parseFloat(rawValue);
    setDemoParams((prev) => ({
      ...prev,
      [field]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleLockedDemoAction = (actionLabel: string) => {
    setDemoLockedNotice(
      `Modo Demonstração: A ação "${actionLabel}" está bloqueada na página inicial. Crie sua conta ou ative os 10 dias grátis do Plano Pro para criar produtos e salvar dados.`
    );
  };

  const totalCostRatio = breakdown.costSharePercent;
  const netProfitRatio = breakdown.profitSharePercent;

  return (
    <div className="min-h-screen bg-[#EEF0F4] dark:bg-[#0B0D13] text-slate-900 dark:text-slate-100 transition-colors overflow-x-hidden">
      {/* TOP BAR CONTRACT: Brand — Nav Links — Top Actions (Planos & Entrar) */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/95 dark:bg-[#11131A]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 sm:gap-6 lg:gap-8 px-3 py-2 sm:px-6 lg:px-10">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#topo"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <span className="grid h-8 w-8 sm:h-9 sm:w-9 grid-cols-2 gap-0.5 rounded-xl bg-[#1D63FF] p-1.5 sm:p-2 text-white shadow-md shadow-blue-600/25">
              <span className="rounded-full bg-white" />
              <span className="rounded-sm bg-white/70" />
              <span className="rounded-sm bg-white/70" />
              <span className="rounded-full bg-white" />
            </span>
            <span>PrintMais</span>
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Navegação da Página Inicial"
            className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <button
              type="button"
              onClick={() => scrollToSection('resumo-sistema')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Resumo do Sistema
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('calculadora-demo')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Calculadora Demo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planos')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Planos & Preços
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          </nav>

          {/* Zone 3: Top Buttons — Instalar App, Planos & Entrar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <PWAInstallButton variant="header" />

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="inline-flex md:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#171A24] text-slate-700 dark:text-slate-200"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>

            <button
              type="button"
              data-testid="header-btn-planos"
              onClick={() => scrollToSection('planos')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#171A24] px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Planos
            </button>

            <button
              type="button"
              data-testid="header-btn-entrar"
              onClick={() => onOpenAuth({ initialMode: 'login' })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0D0F14] dark:bg-[#1D63FF] px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-extrabold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 shadow-sm cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Entrar</span>
            </button>
          </div>
        </div>
      </header>
      <OfflineIndicator />

      <main id="topo" className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12 space-y-16 lg:space-y-24">
        {/* SECTION 1: HERO PROPOSITION */}
        <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Column: Value Proposition & Primary CTA */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-7 sm:p-10 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1D63FF] dark:text-blue-400">
                <span>Gestão & Precificação de Impressão 3D</span>
                <span aria-hidden="true">·</span>
                <span>FDM Filamento & Resina SLA</span>
                <span aria-hidden="true">·</span>
                <span>10 Dias Grátis no Plano Pro</span>
              </div>

              <h1
                className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Transforme cada hora de impressão 3D em lucro líquido real no seu caixa.
              </h1>

              <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                O <strong>PrintMais</strong> calcula o custo exato de filamento, energia elétrica,
                depreciação da máquina, mão de obra e taxa de falha, transforma seus cálculos em
                produtos de catálogo, gera orçamentos em PDF ou WhatsApp e controla seu fluxo de
                caixa completo.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  data-testid="hero-btn-testar-pro"
                  onClick={() =>
                    onOpenAuth({ initialMode: 'register', selectedPlan: 'pro_annual' })
                  }
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-[#1D63FF] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Testar Plano Pro 10 Dias Grátis</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('calculadora-demo')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#191D28] px-5 py-4 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Calculator className="h-4 w-4 text-[#1D63FF]" />
                  <span>Testar Calculadora Abaixo</span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Plano Grátis disponível para sempre</span>
                <span aria-hidden="true">·</span>
                <span>Plano Pro com 10 dias de teste sem compromisso</span>
                <span aria-hidden="true">·</span>
                <span>Acesso imediato no navegador</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dominant Visual Showcase Card (Black in Light Mode, Blue in Dark Mode) */}
          <div className="flex flex-col justify-between rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-7 sm:p-9 text-white shadow-xl lg:col-span-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 dark:text-blue-100">
                  Visão Executiva PrintMais
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300">
                  Precisão de 5 Pilares
                </span>
              </div>

              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                Por que oficinas 3D perdem até 38% de margem sem perceber?
              </h2>
              <p className="mt-2.5 text-sm text-slate-300 dark:text-blue-100 leading-relaxed">
                Cobrar apenas “3x o peso do filamento” ignora kWh, desgaste de bicos/FEP, horas de
                pós-processamento e peças perdidas por falha de aderência.
              </p>

              {/* Proof Comparison Box */}
              <div className="mt-6 space-y-3 rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 dark:text-blue-100">
                    Cálculo Ingênuo (Apenas Peso + Margem)
                  </span>
                  <span className="font-mono font-bold text-rose-300 tabular-nums">
                    R$ 26,86 / peça (Prejuízo Oculto)
                  </span>
                </div>
                <div className="h-px bg-white/15" />
                <div className="flex items-center justify-between text-sm font-extrabold">
                  <span>Preço Recomendado PrintMais</span>
                  <span className="font-mono text-emerald-300 tabular-nums">
                    R$ 79,59 / peça (+R$ 52,72 protegidos)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-white/15 text-left">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums">
                  100%
                </div>
                <div className="mt-0.5 text-xs text-slate-300 dark:text-blue-100">
                  Custos de kWh e depreciação cobertos
                </div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums">
                  1 Clique
                </div>
                <div className="mt-0.5 text-xs text-slate-300 dark:text-blue-100">
                  Orçamento em PDF ou WhatsApp
                </div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums">
                  10 Dias
                </div>
                <div className="mt-0.5 text-xs text-slate-300 dark:text-blue-100">
                  Teste grátis em todo o Plano Pro
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: RESUMO DO SISTEMA (Bento Grid of PrintMais Modules) */}
        <section id="resumo-sistema" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                Ecossistema Completo de Gestão 3D
              </div>
              <h2 className="mt-1 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Tudo o que sua oficina de impressão 3D precisa em um único lugar
              </h2>
            </div>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              Do fatiamento à entrada do dinheiro no caixa: conheça os 4 módulos integrados que
              compõem o PrintMais.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Module 01: Span 7 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-7 sm:p-8 lg:col-span-7">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                    01. Calculadora Técnica & Criação de Produtos
                  </span>
                  <Calculator className="h-5 w-5 text-[#1D63FF]" />
                </div>
                <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Calcule o custo real em segundos e transforme peças em produtos de catálogo
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Configure peso com suportes, preço do kg de filamento ou resina, tempo de máquina,
                  potência em Watts, vida útil da impressora, hora humana de pós-processamento e
                  margem desejada. Com um clique, salve a peça no seu catálogo oficial com SKU e
                  estoque inicial.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Suporte FDM e SLA/DLP</span>
                <span aria-hidden="true">·</span>
                <span>Cálculo de ROI / Payback da Máquina</span>
                <span aria-hidden="true">·</span>
                <span>4 Presets de Produção</span>
              </div>
            </div>

            {/* Module 02: Span 5 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-7 sm:p-8 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                    02. Orçamentos em PDF & WhatsApp
                  </span>
                  <FolderKanban className="h-5 w-5 text-[#1D63FF]" />
                </div>
                <h3 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">
                  Monte propostas comerciais a partir dos seus produtos e quantidades
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Selecione quais produtos o cliente pediu, defina quantidades, desconto, frete e
                  prazo de entrega. Exporte em <strong>PDF profissional</strong> ou copie o{' '}
                  <strong>texto formatado para WhatsApp</strong>. Quando o cliente fechar, converta
                  o orçamento em <strong>Pedido Realizado</strong>.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Folha Técnica PDF</span>
                <span aria-hidden="true">·</span>
                <span>Mensagem pronta p/ WhatsApp</span>
                <span aria-hidden="true">·</span>
                <span>Conversão em Pedido</span>
              </div>
            </div>

            {/* Module 03: Span 5 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-7 sm:p-8 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                    03. Vendas, Fluxo de Caixa & Bobinas
                  </span>
                  <Wallet className="h-5 w-5 text-[#1D63FF]" />
                </div>
                <h3 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">
                  Controle entradas, despesas de manutenção e peso restante de cada carretel
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Registre vendas com cliente, data, horário e forma de pagamento. Cada venda dá
                  baixa no estoque de produtos e entra automaticamente no seu Fluxo de Caixa, ao
                  lado do controle de bobinas com alerta de filamento acabando.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Baixa automática de estoque</span>
                <span aria-hidden="true">·</span>
                <span>Alerta de carretel crítico</span>
              </div>
            </div>

            {/* Module 04: Span 7 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-7 sm:p-8 lg:col-span-7">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                    04. Dashboard Financeiro, Breakeven & Simulador de Fazenda
                  </span>
                  <BarChart3 className="h-5 w-5 text-[#1D63FF]" />
                </div>
                <h3 className="mt-3 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  Saiba exatamente seu ponto de equilíbrio e quando comprar a próxima impressora
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Acompanhe cartões de saldo total, orçamentos pendentes e consumo de filamento com
                  gráficos de tendência mensal. Simule quantas horas e quanto faturamento uma nova
                  impressora 3D trará para sua oficina antes de investir.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Tendência Mensal (Recharts & D3)</span>
                <span aria-hidden="true">·</span>
                <span>Ponto de Equilíbrio (Breakeven)</span>
                <span aria-hidden="true">·</span>
                <span>Simulador de Expansão</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: INTERACTIVE DEMO CALCULATOR (Works live, cannot create product or save anything) */}
        <section id="calculadora-demo" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-6 sm:p-8 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                <span>Demonstração Interativa em Tempo Real</span>
                <span aria-hidden="true">·</span>
                <span>Modo Visitante (Sem Salvamento)</span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Teste a Calculadora PrintMais Agora Mesmo
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Altere o peso, tempo de impressão, potência, valor da máquina e margem para ver a
                anatomia real do custo funcionando ao vivo. Para criar produtos ou salvar no
                catálogo, entre na sua conta.
              </p>
            </div>

            {/* Technology Switcher in Demo */}
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button
                type="button"
                onClick={() => setDemoParams((p) => ({ ...p, technology: 'FDM' }))}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  demoParams.technology === 'FDM'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-[#1A1E29] text-slate-600 dark:text-slate-300'
                }`}
              >
                FDM (Filamento)
              </button>
              <button
                type="button"
                onClick={() => setDemoParams((p) => ({ ...p, technology: 'SLA_Resina' }))}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  demoParams.technology === 'SLA_Resina'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-[#1A1E29] text-slate-600 dark:text-slate-300'
                }`}
              >
                SLA / DLP (Resina)
              </button>
            </div>
          </div>

          {/* 4 Quick Presets Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CALCULATOR_PRESETS.map((preset) => {
              const isSelected = demoParams.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex flex-col justify-between rounded-2xl p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-md'
                      : 'border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] text-slate-900 dark:text-slate-100 hover:border-[#1D63FF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">{preset.name}</span>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        isSelected
                          ? 'text-blue-200'
                          : 'text-[#1D63FF] dark:text-blue-400'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      isSelected ? 'text-slate-200 dark:text-blue-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Locked Demo Notice Banner when visitor clicks disabled/locked actions */}
          {demoLockedNotice && (
            <div
              role="status"
              data-testid="demo-locked-banner"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-xs font-semibold text-amber-900 dark:text-amber-200"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{demoLockedNotice}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onOpenAuth({ initialMode: 'register', selectedPlan: 'pro_annual' })
                  }
                  className="rounded-xl bg-[#1D63FF] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Testar 10 Dias Grátis
                </button>
                <button
                  type="button"
                  onClick={() => setDemoLockedNotice(null)}
                  className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold hover:bg-amber-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* TWO-COLUMN LIVE DEMO CALCULATOR */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* LEFT COLUMN: Input Parameters */}
            <div className="space-y-5 lg:col-span-7">
              {/* Group 1: Material & Tempo */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-6">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
                  <Scale className="h-4 w-4 text-[#1D63FF]" />
                  <span>1. Material & Tempo de Impressão</span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Peso Total com Suportes (g)
                    </span>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      aria-label="Peso Total com Suportes (g)"
                      value={demoParams.weightGrams}
                      onChange={(e) => handleNumericChange('weightGrams', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Preço do {demoParams.technology === 'FDM' ? 'Filamento' : 'Resina'} (R$/kg)
                    </span>
                    <input
                      type="number"
                      min={10}
                      step="1"
                      aria-label="Preço do Filamento ou Resina (R$/kg)"
                      value={demoParams.filamentPricePerKg}
                      onChange={(e) => handleNumericChange('filamentPricePerKg', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Tempo (Horas)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        aria-label="Tempo (Horas)"
                        value={demoParams.printTimeHours}
                        onChange={(e) => handleNumericChange('printTimeHours', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Minutos
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step="1"
                        aria-label="Minutos"
                        value={demoParams.printTimeMinutes}
                        onChange={(e) => handleNumericChange('printTimeMinutes', e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Potência Média da Impressora (W)
                    </span>
                    <input
                      type="number"
                      min={20}
                      step="10"
                      aria-label="Potência Média da Impressora (W)"
                      value={demoParams.printerPowerWatts}
                      onChange={(e) => handleNumericChange('printerPowerWatts', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>
                </div>
              </div>

              {/* Group 2: Operação, Desgaste & Mão de Obra */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-6">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
                  <Wrench className="h-4 w-4 text-[#1D63FF]" />
                  <span>2. Energia, Depreciação da Máquina & Mão de Obra</span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Tarifa Energia (R$/kWh)
                    </span>
                    <input
                      type="number"
                      min={0.1}
                      step="0.05"
                      aria-label="Tarifa Energia (R$/kWh)"
                      value={demoParams.energyRateKwh}
                      onChange={(e) => handleNumericChange('energyRateKwh', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Valor da Impressora (R$)
                    </span>
                    <input
                      type="number"
                      min={500}
                      step="100"
                      aria-label="Valor da Impressora (R$)"
                      value={demoParams.printerCost}
                      onChange={(e) => handleNumericChange('printerCost', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Vida Útil Estimada (h)
                    </span>
                    <input
                      type="number"
                      min={500}
                      step="250"
                      aria-label="Vida Útil Estimada (h)"
                      value={demoParams.printerLifespanHours}
                      onChange={(e) => handleNumericChange('printerLifespanHours', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Hora de Trabalho (R$/h)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="5"
                      aria-label="Hora de Trabalho (R$/h)"
                      value={demoParams.laborHourlyRate}
                      onChange={(e) => handleNumericChange('laborHourlyRate', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Tempo Manual / Pós (h)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.05"
                      aria-label="Tempo Manual / Pós (h)"
                      value={demoParams.laborHours}
                      onChange={(e) => handleNumericChange('laborHours', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Quantidade do Lote (un)
                    </span>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      aria-label="Quantidade do Lote (un)"
                      value={demoParams.batchQuantity}
                      onChange={(e) => handleNumericChange('batchQuantity', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none tabular-nums"
                    />
                  </label>
                </div>
              </div>

              {/* Group 3: Sliders de Margem e Risco */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-6 space-y-5">
                <div className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
                  <Percent className="h-4 w-4 text-[#1D63FF]" />
                  <span>3. Margem de Lucro & Taxa de Risco de Falha</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      Margem de Lucro Desejada sobre o Custo Real
                    </span>
                    <span className="font-mono text-sm font-extrabold text-[#1D63FF] dark:text-blue-400 tabular-nums">
                      {demoParams.profitMarginPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={5}
                    aria-label="Margem de Lucro Desejada (%)"
                    value={demoParams.profitMarginPercent}
                    onChange={(e) => handleNumericChange('profitMarginPercent', e.target.value)}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-[#1D63FF]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      Taxa de Risco de Falha / Retrabalho
                    </span>
                    <span className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                      {demoParams.failureRiskPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    aria-label="Taxa de Risco de Falha (%)"
                    value={demoParams.failureRiskPercent}
                    onChange={(e) => handleNumericChange('failureRiskPercent', e.target.value)}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-800 accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Dynamic Summary & Locked Demo Actions */}
            <div className="space-y-5 lg:col-span-5">
              {/* Featured Price Summary Card (Black in Light Mode, Blue in Dark Mode) */}
              <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-6 sm:p-7 text-white shadow-xl">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-300 dark:text-blue-100">
                    Preço Sugerido Recomendado ({demoParams.batchQuantity} un)
                  </span>
                  <span className="font-mono font-bold text-white">
                    {demoParams.technology === 'FDM' ? 'FDM Filamento' : 'SLA Resina'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <div
                      data-testid="demo-total-suggested-price"
                      className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums"
                    >
                      {formatCurrencyBRL(breakdown.totalBatchPrice)}
                    </div>
                    <div className="mt-1 text-xs text-slate-300 dark:text-blue-100 tabular-nums">
                      Preço Unitário Sugerido:{' '}
                      <strong className="font-mono text-white">
                        {formatCurrencyBRL(breakdown.unitPrice)}
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/15 px-4 py-2.5 text-right backdrop-blur-sm">
                    <div className="text-[11px] font-semibold text-slate-200 dark:text-blue-100">
                      Lucro Líquido do Lote
                    </div>
                    <div className="font-mono text-lg font-extrabold text-emerald-300 tabular-nums">
                      +{formatCurrencyBRL(breakdown.totalBatchProfit)}
                    </div>
                  </div>
                </div>

                {/* Proportion Bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-200 dark:text-blue-100 tabular-nums">
                    <span>
                      Custo Real: {totalCostRatio}% ({formatCurrencyBRL(breakdown.totalBatchCost)})
                    </span>
                    <span>
                      Lucro Líquido: {netProfitRatio}% ({formatCurrencyBRL(breakdown.totalBatchProfit)})
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="bg-slate-900/70 transition-all duration-150"
                      style={{ width: `${totalCostRatio}%` }}
                    />
                    <div
                      className="bg-emerald-400 transition-all duration-150"
                      style={{ width: `${netProfitRatio}%` }}
                    />
                  </div>
                </div>

                {/* 4 Quick KPI Boxes */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3.5">
                    <div className="text-[11px] text-slate-300 dark:text-blue-100">
                      Custo Unitário Real
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                      {formatCurrencyBRL(breakdown.unitCost)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3.5">
                    <div className="text-[11px] text-slate-300 dark:text-blue-100">
                      Lucro Líquido Unitário
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold text-emerald-300 tabular-nums">
                      +{formatCurrencyBRL(breakdown.unitProfit)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3.5">
                    <div className="text-[11px] text-slate-300 dark:text-blue-100">
                      Tempo Total do Lote
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                      {breakdown.totalBatchHours} horas
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3.5">
                    <div className="text-[11px] text-slate-300 dark:text-blue-100">
                      Custo Bruto Material
                    </div>
                    <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums">
                      {formatCurrencyBRL(breakdown.materialCostBatch)}
                    </div>
                  </div>
                </div>

                {/* LOCKED DEMO ACTIONS (Cannot create product or save anything in demo) */}
                <div className="mt-5 space-y-2.5 pt-4 border-t border-white/15">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      data-testid="demo-locked-create-product"
                      onClick={() => handleLockedDemoAction('Criar Produto desta Peça')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white/90 hover:bg-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Criar Produto (Bloqueado na Demo)</span>
                    </button>

                    <button
                      type="button"
                      data-testid="demo-locked-save-sale"
                      onClick={() => handleLockedDemoAction('Salvar / Registrar Venda')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white/90 hover:bg-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Salvar Dados (Bloqueado na Demo)</span>
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-slate-300 dark:text-blue-100">
                    Na demonstração nenhum produto ou orçamento é salvo.{' '}
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAuth({ initialMode: 'register', selectedPlan: 'pro_annual' })
                      }
                      className="font-extrabold underline hover:text-white cursor-pointer"
                    >
                      Crie sua conta para liberar o salvamento →
                    </button>
                  </p>
                </div>
              </div>

              {/* Cost Anatomy Breakdown Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Anatomia Real do Custo (Por Peça & Lote)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Decomposição exata dos 5 pilares de custo da manufatura aditiva
                    </p>
                  </div>
                  <Layers className="h-4 w-4 text-[#1D63FF]" />
                </div>

                <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        1. Custo de Material
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        ({demoParams.weightGrams}g / 1000) × R$ {demoParams.filamentPricePerKg}/kg
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrencyBRL(breakdown.materialCostUnit)} / un
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lote: {formatCurrencyBRL(breakdown.materialCostBatch)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        2. Energia Elétrica
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        ({demoParams.printerPowerWatts}W / 1000) × {breakdown.printHoursDecimal}h × R${' '}
                        {demoParams.energyRateKwh}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrencyBRL(breakdown.energyCostUnit)} / un
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lote: {formatCurrencyBRL(breakdown.energyCostBatch)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        3. Depreciação / Amortização da Máquina
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        (R$ {demoParams.printerCost} / {demoParams.printerLifespanHours}h) ×{' '}
                        {breakdown.printHoursDecimal}h
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrencyBRL(breakdown.depreciationCostUnit)} / un
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lote: {formatCurrencyBRL(breakdown.depreciationCostBatch)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        4. Mão de Obra Humana (Fatiamento & Pós-Proc.)
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {demoParams.laborHours}h × R$ {demoParams.laborHourlyRate}/h
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formatCurrencyBRL(breakdown.laborCostUnit)} / un
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lote: {formatCurrencyBRL(breakdown.laborCostBatch)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-bold text-amber-600 dark:text-amber-400">
                        5. Adicional de Risco de Falha ({demoParams.failureRiskPercent}%)
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {formatCurrencyBRL(breakdown.baseSubtotalUnit)} × ({demoParams.failureRiskPercent}% /
                        100)
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-amber-600 dark:text-amber-400">
                        +{formatCurrencyBRL(breakdown.failureRiskCostUnit)} / un
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lote: +{formatCurrencyBRL(breakdown.failureRiskCostBatch)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: PLANOS & PREÇOS (Grátis, Pro Mensal e Pro Anual com 10 dias de teste grátis) */}
        <section id="planos" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                <span>Planos Transparentes PrintMais</span>
                <span aria-hidden="true">·</span>
                <span>10 Dias de Teste Grátis no Plano Pro</span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Comece grátis ou libere todos os recursos no Plano Pro
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Teste a calculadora e o fluxo inicial no <strong>Plano Grátis</strong>, ou aproveite{' '}
                <strong>10 dias de teste grátis</strong> no <strong>Plano Pro (Mensal ou Anual)</strong>{' '}
                com catálogo ilimitado de produtos, orçamentos em PDF/WhatsApp, fluxo de caixa
                completo e dashboard executivo.
              </p>
            </div>

            {/* Interactive Cycle Filter Control */}
            <div
              role="group"
              aria-label="Destacar modalidade de plano"
              className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13161F] p-1.5"
            >
              <button
                type="button"
                onClick={() => setHighlightedCycle('all')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  highlightedCycle === 'all'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos os Planos
              </button>
              <button
                type="button"
                onClick={() => setHighlightedCycle('monthly')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  highlightedCycle === 'monthly'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pro Mensal (R$ 14,90)
              </button>
              <button
                type="button"
                onClick={() => setHighlightedCycle('annual')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  highlightedCycle === 'annual'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pro Anual (R$ 12,90/mês)
              </button>
            </div>
          </div>

          {/* 3 Plan Cards Grid: Grátis, Pro Mensal, Pro Anual */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {PRINTMAIS_PLANS.map((plan) => {
              const isHighlighted =
                (highlightedCycle === 'monthly' && plan.id === 'pro_monthly') ||
                (highlightedCycle === 'annual' && plan.id === 'pro_annual') ||
                (highlightedCycle === 'all' && plan.isFeatured);

              return (
                <div
                  key={plan.id}
                  data-testid={`plan-card-${plan.id}`}
                  className={`flex flex-col justify-between rounded-3xl p-7 sm:p-8 transition-all ${
                    isHighlighted
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-2xl'
                      : 'border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#13161F] text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div>
                    {/* Plan Header */}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-extrabold tracking-tight">{plan.name}</h3>
                      {plan.trialDays > 0 ? (
                        <span
                          className={`font-mono text-xs font-extrabold ${
                            isHighlighted
                              ? 'text-emerald-300'
                              : 'text-[#1D63FF] dark:text-blue-400'
                          }`}
                        >
                          {plan.trialDays} Dias Grátis
                        </span>
                      ) : (
                        <span
                          className={`font-mono text-xs font-bold ${
                            isHighlighted ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Inicial & Básico
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-2 text-xs leading-relaxed ${
                        isHighlighted
                          ? 'text-slate-200 dark:text-blue-100'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {plan.description}
                    </p>

                    {/* Price Block */}
                    <div className="mt-6 pt-5 border-t border-current/10">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-3xl sm:text-4xl font-extrabold tabular-nums">
                          {plan.priceMonthly === 0
                            ? 'R$ 0'
                            : formatCurrencyBRL(plan.priceMonthly)}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            isHighlighted
                              ? 'text-slate-300 dark:text-blue-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          / mês
                        </span>
                      </div>
                      <div
                        className={`mt-1 text-xs font-medium ${
                          isHighlighted
                            ? 'text-slate-200 dark:text-blue-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {plan.billingLabel}
                      </div>
                    </div>

                    {/* 10-Day Free Trial Highlight Box for Pro Plans */}
                    {plan.trialDays > 0 && (
                      <div
                        className={`mt-5 rounded-2xl p-3.5 text-xs font-bold ${
                          isHighlighted
                            ? 'bg-white/15 text-white'
                            : 'bg-blue-500/10 text-[#1D63FF] dark:text-blue-300'
                        }`}
                      >
                        Teste grátis por {plan.trialDays} dias com todos os recursos Pro liberados.
                        Cancele a qualquer momento.
                      </div>
                    )}

                    {/* Feature List */}
                    <ul className="mt-6 space-y-3 text-xs">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check
                            className={`h-4 w-4 shrink-0 mt-0.5 ${
                              isHighlighted
                                ? 'text-emerald-300'
                                : 'text-[#1D63FF] dark:text-blue-400'
                            }`}
                          />
                          <span
                            className={
                              isHighlighted
                                ? 'text-slate-100'
                                : 'text-slate-700 dark:text-slate-200'
                            }
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Plan CTA Button */}
                  <div className="mt-8 pt-4">
                    <button
                      type="button"
                      data-testid={`btn-select-plan-${plan.id}`}
                      onClick={() =>
                        onOpenAuth({
                          initialMode: 'register',
                          selectedPlan: plan.id,
                        })
                      }
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isHighlighted
                          ? 'bg-white text-[#0D0F14] hover:bg-slate-100 shadow-lg'
                          : 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white hover:opacity-90'
                      }`}
                    >
                      <span>{plan.ctaLabel}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="mt-16 border-t border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#11131A] py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-10 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <span>PrintMais</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-slate-500 dark:text-slate-400">
              Gestão & Precificação Profissional para Impressão 3D
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection('resumo-sistema')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Resumo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('calculadora-demo')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Calculadora Demo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('planos')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Planos
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth({ initialMode: 'login' })}
              className="font-bold text-[#1D63FF] dark:text-blue-400 hover:underline cursor-pointer"
            >
              Entrar na Conta
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
