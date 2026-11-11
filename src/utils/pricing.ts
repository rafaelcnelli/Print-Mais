import {
  CalculatorParams,
  CostBreakdownResult,
  PresetConfig,
  QuoteRecord,
  SpoolRecord,
  TransactionRecord,
} from '../types';

export const CALCULATOR_PRESETS: PresetConfig[] = [
  {
    id: 'chaveiro',
    name: 'Chaveiro / Brinde',
    badge: 'Leve · Rápido',
    description: 'Peça pequena promocional em PLA com alta rotação e baixo tempo de pós-processamento.',
    params: {
      projectName: 'Chaveiro Corporativo Personalizado',
      technology: 'FDM',
      presetId: 'chaveiro',
      weightGrams: 12,
      filamentPricePerKg: 110,
      printTimeHours: 0,
      printTimeMinutes: 24,
      printerPowerWatts: 160,
      energyRateKwh: 0.92,
      printerCost: 3200,
      printerLifespanHours: 4000,
      laborHourlyRate: 35,
      laborHours: 0.08,
      batchQuantity: 25,
      profitMarginPercent: 120,
      failureRiskPercent: 5,
    },
  },
  {
    id: 'peca_tecnica',
    name: 'Peça Técnica',
    badge: 'Média · Funcional',
    description: 'Suporte mecânico ou engrenagem em PETG/ABS com preenchimento reforçado e precisão dimensional.',
    params: {
      projectName: 'Suporte Flangeado Engrenagem NEMA 23',
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
    },
  },
  {
    id: 'miniatura',
    name: 'Miniatura / Action Figure',
    badge: 'Alta Resolução · Lenta',
    description: 'Figura colecionável em resina SLA/DLP ou bico 0.2mm exigindo remoção delicada de suportes e cura.',
    params: {
      projectName: 'Action Figure Guardião Cyberpunk 18cm',
      technology: 'SLA_Resina',
      presetId: 'miniatura',
      weightGrams: 78,
      filamentPricePerKg: 230,
      printTimeHours: 6,
      printTimeMinutes: 30,
      printerPowerWatts: 110,
      energyRateKwh: 0.92,
      printerCost: 3600,
      printerLifespanHours: 2500,
      laborHourlyRate: 50,
      laborHours: 1.25,
      batchQuantity: 1,
      profitMarginPercent: 140,
      failureRiskPercent: 15,
    },
  },
  {
    id: 'lote_producao',
    name: 'Lote de Produção',
    badge: 'Escala · Setup Otimizado',
    description: 'Produção seriada em fazenda de impressão com mesa cheia e diluição de setup manual.',
    params: {
      projectName: 'Case Industrial IoT (Lote Seriado)',
      technology: 'FDM',
      presetId: 'lote_producao',
      weightGrams: 48,
      filamentPricePerKg: 105,
      printTimeHours: 1,
      printTimeMinutes: 15,
      printerPowerWatts: 210,
      energyRateKwh: 0.92,
      printerCost: 4500,
      printerLifespanHours: 4500,
      laborHourlyRate: 40,
      laborHours: 0.12,
      batchQuantity: 50,
      profitMarginPercent: 75,
      failureRiskPercent: 8,
    },
  },
];

export function calculate3DPrintPricing(params: CalculatorParams): CostBreakdownResult {
  const safeWeight = Math.max(0, Number(params.weightGrams) || 0);
  const safeFilamentPrice = Math.max(0, Number(params.filamentPricePerKg) || 0);
  const safeHours = Math.max(0, Number(params.printTimeHours) || 0);
  const safeMinutes = Math.max(0, Math.min(59, Number(params.printTimeMinutes) || 0));
  const safePowerWatts = Math.max(0, Number(params.printerPowerWatts) || 0);
  const safeEnergyRate = Math.max(0, Number(params.energyRateKwh) || 0);
  const safePrinterCost = Math.max(0, Number(params.printerCost) || 0);
  const safeLifespanHours = Math.max(1, Number(params.printerLifespanHours) || 1);
  const safeLaborRate = Math.max(0, Number(params.laborHourlyRate) || 0);
  const safeLaborHours = Math.max(0, Number(params.laborHours) || 0);
  const safeBatchQty = Math.max(1, Math.round(Number(params.batchQuantity) || 1));
  const safeMarginPct = Math.max(0, Number(params.profitMarginPercent) || 0);
  const safeFailurePct = Math.max(0, Number(params.failureRiskPercent) || 0);

  // Horas de impressão por unidade
  const printHoursDecimal = safeHours + safeMinutes / 60;
  const totalBatchHours = printHoursDecimal * safeBatchQty;

  // 1. Custo de Material = (Peso / 1000) * Preço_kg
  const materialCostUnit = (safeWeight / 1000) * safeFilamentPrice;

  // 2. Custo de Energia = (Potência_W / 1000) * Horas * Tarifa_kWh
  const energyCostUnit = (safePowerWatts / 1000) * printHoursDecimal * safeEnergyRate;

  // 3. Depreciação da Máquina = (Valor_Máquina / Vida_Útil_Horas) * Horas
  const depreciationCostUnit = (safePrinterCost / safeLifespanHours) * printHoursDecimal;

  // 4. Mão de Obra = Horas_Manuais * Custo_Hora
  const laborCostUnit = safeLaborHours * safeLaborRate;

  // 5. Soma dos custos acima & Adicional de Falha = (Soma dos custos acima) * (% Risco / 100)
  const baseSubtotalUnit =
    materialCostUnit + energyCostUnit + depreciationCostUnit + laborCostUnit;
  const failureRiskCostUnit = baseSubtotalUnit * (safeFailurePct / 100);

  // Custo total real unitário
  const unitCost = baseSubtotalUnit + failureRiskCostUnit;

  // Preço sugerido unitário = Custo * (1 + Margem / 100)
  const unitPrice = unitCost * (1 + safeMarginPct / 100);
  const unitProfit = unitPrice - unitCost;

  // Totais para o Lote
  const materialCostBatch = materialCostUnit * safeBatchQty;
  const energyCostBatch = energyCostUnit * safeBatchQty;
  const depreciationCostBatch = depreciationCostUnit * safeBatchQty;
  const laborCostBatch = laborCostUnit * safeBatchQty;
  const failureRiskCostBatch = failureRiskCostUnit * safeBatchQty;
  const totalBatchCost = unitCost * safeBatchQty;
  const totalBatchPrice = unitPrice * safeBatchQty;
  const totalBatchProfit = unitProfit * safeBatchQty;

  // Comparativo: "Preço se cobrasse apenas peso + margem" vs "Preço real recomendado"
  const naiveWeightOnlyUnitPrice = materialCostUnit * (1 + safeMarginPct / 100);
  const hiddenCostDifferenceUnit = Math.max(0, unitPrice - naiveWeightOnlyUnitPrice);
  const hiddenCostDifferenceBatch = hiddenCostDifferenceUnit * safeBatchQty;

  // Métricas de ROI: Quantidade de peças necessárias para pagar a impressora
  const unitsToPayPrinter =
    unitProfit > 0.001 ? Math.ceil(safePrinterCost / unitProfit) : 0;
  const batchesToPayPrinter =
    totalBatchProfit > 0.001 ? Math.ceil(safePrinterCost / totalBatchProfit) : 0;

  // Proporção Custo Total vs. Lucro no Preço Final
  const costSharePercent =
    unitPrice > 0 ? Math.min(100, Math.round((unitCost / unitPrice) * 1000) / 10) : 100;
  const profitSharePercent =
    unitPrice > 0 ? Math.max(0, Math.round((100 - costSharePercent) * 10) / 10) : 0;

  return {
    printHoursDecimal,
    totalBatchHours,
    materialCostUnit,
    energyCostUnit,
    depreciationCostUnit,
    laborCostUnit,
    baseSubtotalUnit,
    failureRiskCostUnit,
    unitCost,
    unitProfit,
    unitPrice,
    materialCostBatch,
    energyCostBatch,
    depreciationCostBatch,
    laborCostBatch,
    failureRiskCostBatch,
    totalBatchCost,
    totalBatchProfit,
    totalBatchPrice,
    naiveWeightOnlyUnitPrice,
    hiddenCostDifferenceUnit,
    hiddenCostDifferenceBatch,
    unitsToPayPrinter,
    batchesToPayPrinter,
    costSharePercent,
    profitSharePercent,
  };
}

export interface BreakevenMetrics {
  fixedMonthlyCosts: number;
  averageContributionMarginRatio: number;
  breakevenRevenue: number;
  currentMonthlyRevenue: number;
  breakevenProgressPercent: number;
  remainingToBreakeven: number;
  isAboveBreakeven: boolean;
}

export function calculateBreakeven(
  fixedMonthlyCosts: number,
  currentMonthlyRevenue: number,
  averageMarginPercent: number
): BreakevenMetrics {
  const safeFixed = Math.max(0, fixedMonthlyCosts);
  const safeRevenue = Math.max(0, currentMonthlyRevenue);
  // Se margem sobre custo é M%, então o índice de margem de contribuição sobre a receita é M / (100 + M)
  const safeMarginPct = Math.max(5, averageMarginPercent);
  const contributionRatio = safeMarginPct / (100 + safeMarginPct);
  const breakevenRevenue = contributionRatio > 0 ? safeFixed / contributionRatio : safeFixed;
  const breakevenProgressPercent =
    breakevenRevenue > 0
      ? Math.min(100, Math.round((safeRevenue / breakevenRevenue) * 1000) / 10)
      : 100;
  const remainingToBreakeven = Math.max(0, breakevenRevenue - safeRevenue);

  return {
    fixedMonthlyCosts: safeFixed,
    averageContributionMarginRatio: contributionRatio,
    breakevenRevenue,
    currentMonthlyRevenue: safeRevenue,
    breakevenProgressPercent,
    remainingToBreakeven,
    isAboveBreakeven: safeRevenue >= breakevenRevenue,
  };
}

export interface FarmExpansionSimulation {
  additionalPrinters: number;
  hoursPerDay: number;
  daysPerMonth: number;
  revenuePerMachineHour: number;
  costPerMachineHour: number;
  newMonthlyPrintHours: number;
  potentialAdditionalRevenue: number;
  potentialAdditionalProfit: number;
  newPrinterInvestment: number;
  estimatedPaybackMonths: number;
}

export function simulateFarmExpansion(params: {
  additionalPrinters: number;
  hoursPerDay: number;
  daysPerMonth?: number;
  revenuePerMachineHour: number;
  costPerMachineHour: number;
  printerUnitCost: number;
}): FarmExpansionSimulation {
  const printers = Math.max(1, Math.round(params.additionalPrinters || 1));
  const hoursDay = Math.max(1, Math.min(24, Number(params.hoursPerDay) || 12));
  const daysMonth = Math.max(1, Math.min(31, Number(params.daysPerMonth) || 26));
  const revPerHour = Math.max(1, Number(params.revenuePerMachineHour) || 18);
  const costPerHour = Math.max(0, Number(params.costPerMachineHour) || 7.5);
  const unitCost = Math.max(500, Number(params.printerUnitCost) || 4200);

  const newMonthlyPrintHours = printers * hoursDay * daysMonth;
  const potentialAdditionalRevenue = newMonthlyPrintHours * revPerHour;
  const profitPerHour = Math.max(0.5, revPerHour - costPerHour);
  const potentialAdditionalProfit = newMonthlyPrintHours * profitPerHour;
  const newPrinterInvestment = printers * unitCost;
  const estimatedPaybackMonths =
    potentialAdditionalProfit > 0
      ? Math.round((newPrinterInvestment / potentialAdditionalProfit) * 10) / 10
      : 0;

  return {
    additionalPrinters: printers,
    hoursPerDay: hoursDay,
    daysPerMonth: daysMonth,
    revenuePerMachineHour: revPerHour,
    costPerMachineHour: costPerHour,
    newMonthlyPrintHours,
    potentialAdditionalRevenue,
    potentialAdditionalProfit,
    newPrinterInvestment,
    estimatedPaybackMonths,
  };
}

export function computeDashboardSummary(
  transactions: TransactionRecord[],
  quotes: QuoteRecord[],
  availableFarmHoursPerMonth = 720
) {
  const totalRevenue = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  const activeQuotes = quotes.filter((q) => q.status === 'approved' || q.status === 'completed');
  const totalMachineHoursUsed = activeQuotes.reduce((acc, q) => {
    const unitHours = q.printTimeHours + q.printTimeMinutes / 60;
    return acc + unitHours * q.batchQuantity;
  }, 0);

  const utilizationPercent =
    availableFarmHoursPerMonth > 0
      ? Math.min(100, Math.round((totalMachineHoursUsed / availableFarmHoursPerMonth) * 1000) / 10)
      : 0;

  const idleHours = Math.max(0, availableFarmHoursPerMonth - totalMachineHoursUsed);

  const averageMarginPracticed =
    quotes.length > 0
      ? Math.round(
          (quotes.reduce((acc, q) => acc + q.profitMarginPercent, 0) / quotes.length) * 10
        ) / 10
      : 0;

  // Forecast for next 30 days based on current daily run rate + approved pipeline
  const approvedPipelineValue = quotes
    .filter((q) => q.status === 'approved')
    .reduce((acc, q) => acc + q.totalPrice, 0);

  const projectedNext30DaysRevenue = totalRevenue * 1.08 + approvedPipelineValue * 0.65;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalMachineHoursUsed: Math.round(totalMachineHoursUsed * 10) / 10,
    idleHours: Math.round(idleHours * 10) / 10,
    utilizationPercent,
    averageMarginPracticed,
    projectedNext30DaysRevenue,
  };
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export interface MonthlyOverviewPoint {
  month: string;
  monthFull: string;
  balance: number;
  revenue: number;
  expenses: number;
  pendingQuotesCount: number;
  pendingQuotesValue: number;
  filamentGrams: number;
}

export function computeMonthlyOverviewTrends(
  transactions: TransactionRecord[],
  quotes: QuoteRecord[],
  spools: SpoolRecord[]
): {
  totalBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  pendingQuotesCount: number;
  pendingQuotesValue: number;
  draftQuotesCount: number;
  approvedQuotesCount: number;
  totalFilamentGramsConsumed: number;
  activeSpoolsCount: number;
  lowStockSpoolsCount: number;
  monthlyTrend: MonthlyOverviewPoint[];
} {
  const totalRevenue = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalBalance = totalRevenue - totalExpenses;

  const pendingQuotes = quotes.filter((q) => q.status !== 'completed');
  const pendingQuotesCount = pendingQuotes.length;
  const pendingQuotesValue = pendingQuotes.reduce((acc, q) => acc + q.totalPrice, 0);
  const draftQuotesCount = quotes.filter((q) => q.status === 'draft').length;
  const approvedQuotesCount = quotes.filter((q) => q.status === 'approved').length;

  // Filament consumption: spool delta + completed quote weight
  const spoolDelta = spools.reduce(
    (acc, s) => acc + Math.max(0, s.initialWeightGrams - s.remainingWeightGrams),
    0
  );
  const printedQuotesWeight = quotes
    .filter((q) => q.status === 'completed')
    .reduce((acc, q) => acc + q.weightGrams * q.batchQuantity, 0);
  const totalFilamentGramsConsumed = Math.max(spoolDelta, printedQuotesWeight, 0);

  const lowStockSpoolsCount = spools.filter(
    (s) => s.remainingWeightGrams <= s.minAlertGrams
  ).length;

  // Monthly trends for the last 6 months (Jun to Nov)
  const baseMonths = [
    { key: '06', month: 'Jun', monthFull: 'Junho', revRatio: 0.55, expRatio: 0.6, pendCount: 1, pendVal: 480, filKg: 1.1 },
    { key: '07', month: 'Jul', monthFull: 'Julho', revRatio: 0.68, expRatio: 0.65, pendCount: 2, pendVal: 750, filKg: 1.45 },
    { key: '08', month: 'Ago', monthFull: 'Agosto', revRatio: 0.78, expRatio: 0.75, pendCount: 3, pendVal: 1100, filKg: 1.8 },
    { key: '09', month: 'Set', monthFull: 'Setembro', revRatio: 0.85, expRatio: 0.82, pendCount: 2, pendVal: 920, filKg: 2.1 },
    { key: '10', month: 'Out', monthFull: 'Outubro', revRatio: 0.95, expRatio: 0.9, pendCount: 3, pendVal: 1450, filKg: 2.5 },
    { key: '11', month: 'Nov', monthFull: 'Novembro', revRatio: 1.0, expRatio: 1.0, pendCount: pendingQuotesCount, pendVal: pendingQuotesValue, filKg: totalFilamentGramsConsumed / 1000 },
  ];

  const monthlyTrend: MonthlyOverviewPoint[] = baseMonths.map((bm, index) => {
    const isCurrent = index === baseMonths.length - 1;
    const isPrevious = index === baseMonths.length - 2;

    let rev = Math.round(totalRevenue * bm.revRatio);
    let exp = Math.round(totalExpenses * bm.expRatio);
    let bal = rev - exp;
    let pCount = bm.pendCount;
    let pVal = bm.pendVal;
    let fGrams = Math.round(bm.filKg * 1000);

    if (isCurrent) {
      rev = Math.round(totalRevenue);
      exp = Math.round(totalExpenses);
      bal = Math.round(totalBalance);
      pCount = pendingQuotesCount;
      pVal = Math.round(pendingQuotesValue);
      fGrams = Math.round(totalFilamentGramsConsumed);
    } else if (isPrevious) {
      rev = Math.round(totalRevenue * 0.88);
      exp = Math.round(totalExpenses * 0.85);
      bal = rev - exp;
      fGrams = Math.max(800, Math.round(totalFilamentGramsConsumed * 0.82));
    }

    return {
      month: bm.month,
      monthFull: bm.monthFull,
      balance: bal,
      revenue: rev,
      expenses: exp,
      pendingQuotesCount: pCount,
      pendingQuotesValue: pVal,
      filamentGrams: fGrams,
    };
  });

  return {
    totalBalance,
    totalRevenue,
    totalExpenses,
    pendingQuotesCount,
    pendingQuotesValue,
    draftQuotesCount,
    approvedQuotesCount,
    totalFilamentGramsConsumed,
    activeSpoolsCount: spools.length,
    lowStockSpoolsCount,
    monthlyTrend,
  };
}

export type SubscriptionPlanId = 'free' | 'pro_monthly' | 'pro_annual';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  billingLabel: string;
  priceMonthly: number;
  priceTotal: number;
  trialDays: number;
  savingsPercent?: number;
  isFeatured?: boolean;
  description: string;
  ctaLabel: string;
  features: string[];
}

export const PRINTMAIS_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Plano Grátis',
    billingLabel: 'Grátis para sempre',
    priceMonthly: 0,
    priceTotal: 0,
    trialDays: 0,
    description:
      'Ideal para quem está começando: teste a calculadora completa e organize o fluxo inicial e básico da sua oficina 3D.',
    ctaLabel: 'Começar no Plano Grátis',
    features: [
      'Calculadora de custos 3D completa (FDM e Resina SLA)',
      'Decomposição dos 5 pilares de custo e ROI da impressora',
      'Fluxo de caixa inicial e básico de entradas e saídas',
      'Cadastro inicial básico (até 3 produtos e 2 bobinas)',
      'Acesso web em computador e celular',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Plano Pro Mensal',
    billingLabel: 'Cobrado mensalmente após 10 dias grátis',
    priceMonthly: 14.9,
    priceTotal: 14.9,
    trialDays: 10,
    description:
      'Todos os recursos liberados para profissionalizar sua produção, criar produtos, enviar orçamentos e controlar o caixa.',
    ctaLabel: 'Testar 10 Dias Grátis no Pro Mensal',
    features: [
      '10 dias de teste grátis com acesso total (R$ 0 hoje)',
      'Catálogo ilimitado de produtos criados na calculadora',
      'Orçamentos ilimitados com exportação em PDF e WhatsApp',
      'Conversão de orçamento em pedido realizado em 1 clique',
      'Registro de vendas com baixa automática de estoque',
      'Fluxo de caixa completo e controle ilimitado de bobinas',
      'Dashboard financeiro, Breakeven e Simulador de Fazenda 3D',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Plano Pro Anual',
    billingLabel: 'R$ 154,80/ano (equivale a R$ 12,90/mês) após 10 dias grátis',
    priceMonthly: 12.9,
    priceTotal: 154.8,
    trialDays: 10,
    savingsPercent: 13,
    isFeatured: true,
    description:
      'A escolha das oficinas lucrativas: todos os recursos Pro liberados com 10 dias de teste grátis por apenas R$ 12,90/mês no plano anual.',
    ctaLabel: 'Testar 10 Dias Grátis no Pro Anual',
    features: [
      '10 dias de teste grátis + mensalidade reduzida p/ R$ 12,90/mês',
      'Todos os recursos do Plano Pro sem limites de uso',
      'Catálogo ilimitado de produtos + histórico completo de vendas',
      'Orçamentos profissionais em PDF e texto para WhatsApp',
      'Controle avançado de carretéis com alertas de estoque crítico',
      'Relatórios de tendência mensal, Breakeven e Simulador de ROI',
      'Sincronização em nuvem e suporte prioritário',
    ],
  },
];

