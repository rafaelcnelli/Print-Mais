import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculate3DPrintPricing,
  calculateBreakeven,
  simulateFarmExpansion,
  CALCULATOR_PRESETS,
} from './pricing';

test('calculate3DPrintPricing computes exact Cost Anatomy formulas', () => {
  const result = calculate3DPrintPricing({
    clientName: 'Cliente Teste',
    projectName: 'Engrenagem Helicoidal',
    technology: 'FDM',
    presetId: 'peca_tecnica',
    weightGrams: 100, // 0.1 kg
    filamentPricePerKg: 120, // Material = (100/1000)*120 = R$ 12.00
    printTimeHours: 4,
    printTimeMinutes: 0, // 4 hours
    printerPowerWatts: 250, // 0.25 kW * 4h = 1.0 kWh
    energyRateKwh: 1.0, // Energia = R$ 1.00
    printerCost: 4000,
    printerLifespanHours: 4000, // Depreciação = (4000/4000)*4 = R$ 4.00
    laborHourlyRate: 30,
    laborHours: 0.5, // Mão de Obra = 0.5 * 30 = R$ 15.00
    batchQuantity: 2,
    profitMarginPercent: 100, // +100%
    failureRiskPercent: 10, // +10% sobre (12 + 1 + 4 + 15 = 32) -> R$ 3.20
  });

  assert.equal(result.materialCostUnit, 12);
  assert.equal(result.energyCostUnit, 1);
  assert.equal(result.depreciationCostUnit, 4);
  assert.equal(result.laborCostUnit, 15);
  assert.equal(result.baseSubtotalUnit, 32);
  assert.ok(Math.abs(result.failureRiskCostUnit - 3.2) < 1e-6);
  assert.ok(Math.abs(result.unitCost - 35.2) < 1e-6);
  assert.ok(Math.abs(result.unitPrice - 70.4) < 1e-6);
  assert.ok(Math.abs(result.unitProfit - 35.2) < 1e-6);
  assert.ok(Math.abs(result.totalBatchPrice - 140.8) < 1e-6);
  // Naive weight-only price: 12 * (1 + 1.0) = 24.00
  assert.ok(Math.abs(result.naiveWeightOnlyUnitPrice - 24) < 1e-6);
  assert.ok(Math.abs(result.hiddenCostDifferenceUnit - 46.4) < 1e-6);
  // ROI: 4000 / 35.2 = 113.63 -> 114 units
  assert.equal(result.unitsToPayPrinter, 114);
});

test('CALCULATOR_PRESETS contains all 4 required presets', () => {
  const ids = CALCULATOR_PRESETS.map((p) => p.id);
  assert.deepEqual(ids, ['chaveiro', 'peca_tecnica', 'miniatura', 'lote_producao']);
});

test('calculateBreakeven accurately determines monthly breakeven point', () => {
  const breakeven = calculateBreakeven(1500, 3500, 100);
  // Margin 100% on cost means 50% contribution margin on revenue -> breakeven = 1500 / 0.5 = 3000
  assert.equal(breakeven.breakevenRevenue, 3000);
  assert.equal(breakeven.isAboveBreakeven, true);
  assert.equal(breakeven.remainingToBreakeven, 0);
});

test('simulateFarmExpansion computes monthly hours, revenue, and payback', () => {
  const sim = simulateFarmExpansion({
    additionalPrinters: 2,
    hoursPerDay: 15,
    daysPerMonth: 25,
    revenuePerMachineHour: 20,
    costPerMachineHour: 8,
    printerUnitCost: 4500,
  });

  assert.equal(sim.newMonthlyPrintHours, 750);
  assert.equal(sim.potentialAdditionalRevenue, 15000);
  assert.equal(sim.potentialAdditionalProfit, 9000);
  assert.equal(sim.newPrinterInvestment, 9000);
  assert.equal(sim.estimatedPaybackMonths, 1);
});

test('computeMonthlyOverviewTrends calculates total balance, pending quotes, and filament consumption', async () => {
  const { computeMonthlyOverviewTrends } = await import('./pricing');
  const { INITIAL_QUOTES, INITIAL_SPOOLS, INITIAL_TRANSACTIONS } = await import('./seedData');

  const overview = computeMonthlyOverviewTrends(
    INITIAL_TRANSACTIONS,
    INITIAL_QUOTES,
    INITIAL_SPOOLS
  );

  // Balance: Incomes (1128 + 822.24 + 1490 = 3440.24) - Expenses (890 + 215.50 + 312.80 = 1418.30) = 2021.94
  assert.ok(Math.abs(overview.totalBalance - 2021.94) < 1e-4);
  assert.equal(overview.totalRevenue, 3440.24);
  assert.equal(overview.totalExpenses, 1418.30);

  // Pending quotes: quote 2 (approved) + quote 4 (draft) = 2 pending quotes
  assert.equal(overview.pendingQuotesCount, 2);
  assert.equal(overview.draftQuotesCount, 1);
  assert.equal(overview.approvedQuotesCount, 1);
  assert.ok(overview.pendingQuotesValue > 0);

  // Filament consumption: spools consumed delta (260 + 855 + 820 + 140 = 2075g) or completed quotes weight
  assert.ok(overview.totalFilamentGramsConsumed >= 2075);
  assert.equal(overview.activeSpoolsCount, 4);
  assert.equal(overview.lowStockSpoolsCount, 2);

  // Monthly trend series
  assert.equal(overview.monthlyTrend.length, 6);
  assert.equal(overview.monthlyTrend[5].month, 'Nov');
  assert.equal(overview.monthlyTrend[5].pendingQuotesCount, 2);
});

test('INITIAL_PRODUCTS and INITIAL_SALES link products, date, time, client, and Cash Flow transactions', async () => {
  const { INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_TRANSACTIONS } = await import('./seedData');

  assert.equal(INITIAL_PRODUCTS.length, 4);
  assert.equal(INITIAL_SALES.length, 3);

  for (const sale of INITIAL_SALES) {
    assert.ok(sale.saleDate.length === 10);
    assert.ok(sale.saleTime.includes(':'));
    assert.ok(sale.clientName.length > 0);
    assert.ok(sale.items.length > 0);
    assert.ok(sale.totalAmount > 0);
    // Verify each completed sale is present in Cash Flow transactions
    const linkedTx = INITIAL_TRANSACTIONS.find((t) => t.id === sale.transactionId);
    assert.ok(linkedTx, `Expected Cash Flow transaction for sale ${sale.id}`);
    assert.equal(linkedTx.amount, sale.totalAmount);
    assert.equal(linkedTx.dateIso, sale.saleDate);
    assert.equal(linkedTx.saleTime, sale.saleTime);
  }
});

test('Quotes are built from products with quantities and generate WhatsApp text', async () => {
  const { INITIAL_QUOTES } = await import('./seedData');
  const { buildQuoteWhatsAppMessage } = await import('../components/QuotePdfModal');

  for (const quote of INITIAL_QUOTES) {
    assert.ok(Array.isArray(quote.items) && quote.items.length > 0);
    const totalQty = quote.items.reduce((acc, i) => acc + i.quantity, 0);
    assert.equal(totalQty, quote.batchQuantity);

    const waText = buildQuoteWhatsAppMessage(quote);
    assert.ok(waText.includes(quote.clientName));
    for (const item of quote.items) {
      assert.ok(waText.includes(`${item.quantity}x ${item.productName}`));
    }
  }
});

test('PRINTMAIS_PLANS includes Free plan and Pro Monthly/Annual plans with 10-day free trial', async () => {
  const { PRINTMAIS_PLANS } = await import('./pricing');

  assert.equal(PRINTMAIS_PLANS.length, 3);
  const freePlan = PRINTMAIS_PLANS.find((p) => p.id === 'free');
  const proMonthly = PRINTMAIS_PLANS.find((p) => p.id === 'pro_monthly');
  const proAnnual = PRINTMAIS_PLANS.find((p) => p.id === 'pro_annual');

  assert.ok(freePlan);
  assert.equal(freePlan.priceMonthly, 0);
  assert.equal(freePlan.trialDays, 0);

  assert.ok(proMonthly);
  assert.equal(proMonthly.trialDays, 10);
  assert.equal(proMonthly.priceMonthly, 14.9);

  assert.ok(proAnnual);
  assert.equal(proAnnual.trialDays, 10);
  assert.equal(proAnnual.priceMonthly, 12.9);
  assert.equal(proAnnual.priceTotal, 154.8);
});

test('INITIAL_CATEGORIES and INITIAL_PRODUCTS support category filtering and product photo previews', async () => {
  const { INITIAL_CATEGORIES, INITIAL_PRODUCTS } = await import('./seedData');
  const { createSvgProductPreviewDataUrl } = await import('./imageHelpers');

  assert.ok(INITIAL_CATEGORIES.length >= 4);
  const categoryNames = INITIAL_CATEGORIES.map((c) => c.name);
  assert.ok(categoryNames.includes('Peça Técnica'));
  assert.ok(categoryNames.includes('Miniatura / Action Figure'));

  for (const prod of INITIAL_PRODUCTS) {
    assert.ok(prod.imageUrl && prod.imageUrl.startsWith('data:image/svg+xml'));
    assert.ok(categoryNames.includes(prod.category));
  }

  const customPreview = createSvgProductPreviewDataUrl(
    'Suporte GoPro Capacete',
    'Peça Técnica',
    '#1D63FF'
  );
  assert.ok(customPreview.startsWith('data:image/svg+xml;utf8,'));
});

test('isDateWithinTimeRange filters dates correctly for month, 3months, 6months, 1year, custom, and all', async () => {
  const { isDateWithinTimeRange } = await import('../components/TimeRangeSelector');

  // Reference date: 2026-11-15T12:00:00Z
  const refDate = new Date('2026-11-15T12:00:00Z');

  // Dates:
  // 10 days ago: 2026-11-05
  // 45 days ago: 2026-10-01
  // 120 days ago: 2026-07-18
  // 240 days ago: 2026-03-20
  // 400 days ago: 2025-10-11
  const d10 = '2026-11-05T10:00:00Z';
  const d45 = '2026-10-01T10:00:00Z';
  const d120 = '2026-07-18T10:00:00Z';
  const d240 = '2026-03-20T10:00:00Z';
  const d400 = '2025-10-11T10:00:00Z';

  // All
  assert.equal(isDateWithinTimeRange(d400, { period: 'all' }, refDate), true);

  // Month (30 days)
  assert.equal(isDateWithinTimeRange(d10, { period: 'month' }, refDate), true);
  assert.equal(isDateWithinTimeRange(d45, { period: 'month' }, refDate), false);

  // 3 Months (90 days)
  assert.equal(isDateWithinTimeRange(d10, { period: '3months' }, refDate), true);
  assert.equal(isDateWithinTimeRange(d45, { period: '3months' }, refDate), true);
  assert.equal(isDateWithinTimeRange(d120, { period: '3months' }, refDate), false);

  // 6 Months (180 days)
  assert.equal(isDateWithinTimeRange(d120, { period: '6months' }, refDate), true);
  assert.equal(isDateWithinTimeRange(d240, { period: '6months' }, refDate), false);

  // 1 Year (365 days)
  assert.equal(isDateWithinTimeRange(d240, { period: '1year' }, refDate), true);
  assert.equal(isDateWithinTimeRange(d400, { period: '1year' }, refDate), false);

  // Custom date range
  assert.equal(
    isDateWithinTimeRange(
      d45,
      { period: 'custom', startDate: '2026-09-01', endDate: '2026-10-15' },
      refDate
    ),
    true
  );
  assert.equal(
    isDateWithinTimeRange(
      d10,
      { period: 'custom', startDate: '2026-09-01', endDate: '2026-10-15' },
      refDate
    ),
    false
  );
});

test('FAMOUS_FILAMENT_BRANDS includes famous 3D printing brands and Genérico', async () => {
  const { FAMOUS_FILAMENT_BRANDS } = await import('../components/InventoryView');

  assert.ok(Array.isArray(FAMOUS_FILAMENT_BRANDS));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Genérico'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Voolt3D'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Bambu Lab'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('eSUN'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Creality'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('GTMax3D'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Sunlu'));
  assert.ok(FAMOUS_FILAMENT_BRANDS.includes('Elegoo'));
});


