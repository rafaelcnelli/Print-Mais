import React, { useMemo, useState } from 'react';
import {
  CalculatorParams,
  ProductCategoryRecord,
  ProductRecord,
  SaleRecord,
  SpoolRecord,
} from '../types';
import {
  calculate3DPrintPricing,
  formatCurrencyBRL,
} from '../utils/pricing';
import { ProductSalesWorkspace } from './ProductSalesWorkspace';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  CheckCircle2,
  FolderPlus,
  Layers,
  Package,
  PackagePlus,
  Percent,
  Plus,
  Scale,
  ShoppingCart,
  Tags,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface CalculatorViewProps {
  params: CalculatorParams;
  onChangeParams: (next: CalculatorParams) => void;
  spools: SpoolRecord[];
  products: ProductRecord[];
  categories: ProductCategoryRecord[];
  onCreateCategory: (
    categoryInput: Omit<ProductCategoryRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => ProductCategoryRecord | Promise<ProductCategoryRecord>;
  onDeleteCategory: (categoryId: string) => void;
  sales: SaleRecord[];
  onCreateProduct: (
    productInput: Omit<ProductRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => ProductRecord | Promise<ProductRecord>;
  onDeleteProduct: (productId: string) => void;
  onRegisterSale: (
    saleInput: Omit<SaleRecord, 'id' | 'ownerId' | 'transactionId' | 'createdAtIso'>
  ) => void | Promise<void>;
  onDeleteSale: (sale: SaleRecord) => void;
  onNavigateToCashflow: () => void;
}

const CATEGORY_COLORS = [
  { label: 'Azul Royal', hex: '#1D63FF' },
  { label: 'Verde Esmeralda', hex: '#10B981' },
  { label: 'Violeta', hex: '#8B5CF6' },
  { label: 'Âmbar', hex: '#F59E0B' },
  { label: 'Ciano', hex: '#06B6D4' },
  { label: 'Rosa', hex: '#EC4899' },
  { label: 'Laranja', hex: '#F97316' },
];

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  params,
  onChangeParams,
  spools,
  products,
  categories,
  onCreateCategory,
  onDeleteCategory,
  sales,
  onCreateProduct,
  onDeleteProduct,
  onRegisterSale,
  onDeleteSale,
  onNavigateToCashflow,
}) => {
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isRegisterSaleModalOpen, setIsRegisterSaleModalOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Category registration state
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('#1D63FF');
  const [catError, setCatError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryRecord | null>(null);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>(
    categories[0]?.name || 'Peça Técnica'
  );

  const breakdown = useMemo(() => calculate3DPrintPricing(params), [params]);

  const showToast = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3200);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    if (!newCatName.trim()) {
      setCatError('O nome da categoria é obrigatório.');
      return;
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists) {
      setCatError('Já existe uma categoria cadastrada com este nome.');
      return;
    }
    onCreateCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim() || '',
      colorHex: newCatColor,
    });
    showToast(`Categoria "${newCatName.trim()}" cadastrada com sucesso!`);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatColor('#1D63FF');
    setIsCategoryFormOpen(false);
  };

  const handleLoadProductIntoCalculator = (product: ProductRecord) => {
    if (product.paramsSnapshot) {
      onChangeParams({
        ...product.paramsSnapshot,
        projectName: product.name,
      });
    } else {
      onChangeParams({
        ...params,
        projectName: product.name,
        technology: product.technology,
        weightGrams: product.weightGrams,
        printTimeHours: product.printTimeHours,
        printTimeMinutes: product.printTimeMinutes,
        filamentPricePerKg: product.filamentPricePerKg,
        profitMarginPercent: product.profitMarginPercent,
      });
    }
    if (product.category) {
      setSelectedProductCategory(product.category);
    }
    showToast(`Parâmetros do produto "${product.name}" carregados na calculadora!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSaleWorkspace = () => {
    setIsRegisterSaleModalOpen(true);
    const el = document.getElementById('workspace-produtos-vendas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToCatalog = () => {
    const el = document.getElementById('workspace-produtos-vendas');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNumericChange = (field: keyof CalculatorParams, rawValue: string) => {
    const parsed = rawValue === '' ? 0 : parseFloat(rawValue);
    onChangeParams({
      ...params,
      [field]: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleSpoolSelect = (spoolId: string) => {
    const found = spools.find((s) => s.id === spoolId);
    if (!found) return;
    const pricePerKg =
      found.initialWeightGrams > 0
        ? Math.round((found.pricePaid / (found.initialWeightGrams / 1000)) * 100) / 100
        : params.filamentPricePerKg;
    onChangeParams({
      ...params,
      filamentPricePerKg: pricePerKg,
      technology: found.materialType.startsWith('Resina') ? 'SLA_Resina' : 'FDM',
    });
    showToast(
      `Material "${found.name}" selecionado (${formatCurrencyBRL(pricePerKg)}/kg).`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Calculadora de Custos & Precificação 3D
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure material, tempo, custos e categoria para apurar o preço sugerido exato
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {feedbackBanner && (
            <div
              role="status"
              className="inline-flex items-center gap-2 rounded-full bg-[#1D63FF]/15 px-3.5 py-1.5 text-xs font-semibold text-[#1D63FF] dark:text-blue-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {feedbackBanner}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCreateProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1D63FF] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            Criar Produto ({products.length})
          </button>
          <button
            type="button"
            onClick={handleOpenSaleWorkspace}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Registrar Venda ({sales.length})
          </button>
          <button
            type="button"
            onClick={handleScrollToCatalog}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
          >
            <Package className="h-3.5 w-3.5 text-[#1D63FF]" />
            Catálogo ({products.length})
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        {/* LEFT COLUMN: Parameter Form (7 cols on XL) */}
        <div className="space-y-5 xl:col-span-7">
          {/* Card 0: Identificação do Produto & Tecnologia */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Identificação do Produto & Tecnologia
              </h3>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
                <button
                  type="button"
                  onClick={() => onChangeParams({ ...params, technology: 'FDM' })}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    params.technology === 'FDM'
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  FDM (Filamento)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeParams({ ...params, technology: 'SLA_Resina' })}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    params.technology === 'SLA_Resina'
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  SLA / DLP (Resina)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="calc-project-name"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Nome do Produto / Peça 3D
                </label>
                <input
                  id="calc-project-name"
                  type="text"
                  value={params.projectName}
                  onChange={(e) =>
                    onChangeParams({ ...params, projectName: e.target.value })
                  }
                  placeholder="Ex: Suporte Flangeado NEMA 23"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-client-name"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Linha / Referência do Produto
                </label>
                <input
                  id="calc-client-name"
                  type="text"
                  value={params.clientName}
                  onChange={(e) =>
                    onChangeParams({ ...params, clientName: e.target.value })
                  }
                  placeholder="Ex: Linha Industrial / Setup Gamer"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 1: Material e Tempo */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#1D63FF] shrink-0">
                  <Scale className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    1. Material e Tempo de Impressão
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dados do fatiador (OrcaSlicer, Bambu Studio, Chitubox)
                  </p>
                </div>
              </div>

              {spools.length > 0 && (
                <div className="w-full sm:w-auto">
                  <select
                    aria-label="Vincular preço de bobina do estoque"
                    onChange={(e) => handleSpoolSelect(e.target.value)}
                    defaultValue=""
                    className="w-full sm:w-auto max-w-full truncate rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 focus:border-[#1D63FF] focus:outline-none"
                  >
                    <option value="" disabled>
                      Usar bobina do estoque...
                    </option>
                    {spools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.remainingWeightGrams}g disp.)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="input-weight-grams"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Peso total c/ suportes (g)
                </label>
                <input
                  id="input-weight-grams"
                  type="number"
                  min={0}
                  step={1}
                  value={params.weightGrams}
                  onChange={(e) => handleNumericChange('weightGrams', e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-filament-price"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Preço Filamento/Resina (R$/kg)
                </label>
                <input
                  id="input-filament-price"
                  type="number"
                  min={0}
                  step={5}
                  value={params.filamentPricePerKg}
                  onChange={(e) =>
                    handleNumericChange('filamentPricePerKg', e.target.value)
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-power-watts"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Potência média máquina (W)
                </label>
                <input
                  id="input-power-watts"
                  type="number"
                  min={0}
                  step={10}
                  value={params.printerPowerWatts}
                  onChange={(e) =>
                    handleNumericChange('printerPowerWatts', e.target.value)
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-print-hours"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Tempo de impressão (Horas)
                </label>
                <input
                  id="input-print-hours"
                  type="number"
                  min={0}
                  step={1}
                  value={params.printTimeHours}
                  onChange={(e) => handleNumericChange('printTimeHours', e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-print-minutes"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Tempo adicional (Minutos)
                </label>
                <input
                  id="input-print-minutes"
                  type="number"
                  min={0}
                  max={59}
                  step={1}
                  value={params.printTimeMinutes}
                  onChange={(e) =>
                    handleNumericChange('printTimeMinutes', e.target.value)
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-slate-100/60 dark:bg-[#0D0F14] px-3.5 py-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tempo Decimal / Unid.
                  </div>
                  <div className="text-sm font-extrabold tabular-nums text-[#1D63FF]">
                    {breakdown.printHoursDecimal.toFixed(2)} h/un
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Operação, Desgaste e Mão de Obra */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Operação e Desgaste */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    2. Operação & Desgaste
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Energia elétrica e amortização
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label
                    htmlFor="input-energy-rate"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Tarifa de Energia (R$/kWh)
                  </label>
                  <input
                    id="input-energy-rate"
                    type="number"
                    min={0}
                    step={0.05}
                    value={params.energyRateKwh}
                    onChange={(e) =>
                      handleNumericChange('energyRateKwh', e.target.value)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-printer-cost"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Custo de Aquisição da Impressora (R$)
                  </label>
                  <input
                    id="input-printer-cost"
                    type="number"
                    min={0}
                    step={100}
                    value={params.printerCost}
                    onChange={(e) => handleNumericChange('printerCost', e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-printer-lifespan"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Vida Útil Estimada da Máquina (Horas)
                  </label>
                  <input
                    id="input-printer-lifespan"
                    type="number"
                    min={100}
                    step={250}
                    value={params.printerLifespanHours}
                    onChange={(e) =>
                      handleNumericChange('printerLifespanHours', e.target.value)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mão de Obra e Setup */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Wrench className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    3. Mão de Obra & Lote
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Fatiamento, acabamento e escala
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label
                    htmlFor="input-labor-rate"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Valor da Hora Humana (R$/h)
                  </label>
                  <input
                    id="input-labor-rate"
                    type="number"
                    min={0}
                    step={5}
                    value={params.laborHourlyRate}
                    onChange={(e) =>
                      handleNumericChange('laborHourlyRate', e.target.value)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-labor-hours"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Horas Manuais por Peça (Setup/Suportes)
                  </label>
                  <input
                    id="input-labor-hours"
                    type="number"
                    min={0}
                    step={0.05}
                    value={params.laborHours}
                    onChange={(e) => handleNumericChange('laborHours', e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-batch-qty"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Quantidade do Lote (un)
                  </label>
                  <input
                    id="input-batch-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={params.batchQuantity}
                    onChange={(e) =>
                      handleNumericChange('batchQuantity', e.target.value)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Sliders Dinâmicos de Margens e Riscos */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#1D63FF]">
                <Percent className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  4. Margem de Lucro & Taxa de Risco Operacional
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ajuste os controles deslizantes para calibrar retorno e proteção contra falhas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Profit Margin Slider */}
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="slider-profit-margin"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    Margem de Lucro Desejada
                  </label>
                  <span className="text-lg font-extrabold tabular-nums text-[#1D63FF]">
                    {params.profitMarginPercent}%
                  </span>
                </div>
                <input
                  id="slider-profit-margin"
                  type="range"
                  min={10}
                  max={300}
                  step={5}
                  value={params.profitMarginPercent}
                  onChange={(e) =>
                    handleNumericChange('profitMarginPercent', e.target.value)
                  }
                  className="mt-3 h-2 w-full cursor-pointer rounded-lg"
                />
                <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>10% (Atacado)</span>
                  <span>100% (Padrão)</span>
                  <span>300% (Escultura)</span>
                </div>
              </div>

              {/* Failure Risk Slider */}
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="slider-failure-risk"
                    className="text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    Taxa de Risco de Falha / Retrabalho
                  </label>
                  <span className="text-lg font-extrabold tabular-nums text-amber-500">
                    {params.failureRiskPercent}%
                  </span>
                </div>
                <input
                  id="slider-failure-risk"
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={params.failureRiskPercent}
                  onChange={(e) =>
                    handleNumericChange('failureRiskPercent', e.target.value)
                  }
                  className="mt-3 h-2 w-full cursor-pointer rounded-lg"
                />
                <div className="mt-2 flex justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>0% (Sem reserva)</span>
                  <span>10% (Seguro)</span>
                  <span>50% (Crítico)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Escolher Categoria do Produto */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-[#1D63FF] shrink-0">
                  <Tags className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    5. Escolher Categoria do Produto
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione ou cadastre a categoria para classificar este produto no catálogo e nos orçamentos
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryFormOpen(!isCategoryFormOpen)}
                data-testid="btn-open-category-form-item5"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0D0F14] px-3.5 py-1.5 text-xs font-bold text-[#1D63FF] hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                {isCategoryFormOpen ? 'Fechar Cadastro' : '+ Cadastrar Nova Categoria'}
              </button>
            </div>

            {/* Selected Category Highlight Banner */}
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#0D0F14] border border-slate-200/70 dark:border-slate-800 px-4 py-2.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Categoria selecionada para esta peça:
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1D63FF]/15 px-3 py-1 text-xs font-extrabold text-[#1D63FF] dark:text-blue-400">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      categories.find((c) => c.name === selectedProductCategory)
                        ?.colorHex || '#1D63FF',
                  }}
                />
                {selectedProductCategory || 'Nenhuma selecionada'}
              </span>
            </div>

            {/* Inline Category Registration Form if expanded */}
            {isCategoryFormOpen && (
              <form
                onSubmit={handleSaveCategory}
                className="mb-4 rounded-2xl border-2 border-dashed border-[#1D63FF]/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-3.5 w-3.5 text-[#1D63FF]" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Cadastrar Nova Categoria
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {catError && (
                  <div className="mb-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-500 font-semibold">
                    {catError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Nome da Categoria *
                    </label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Ex: Peças Automotivas, Cosplay..."
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Cor da Etiqueta
                    </label>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {CATEGORY_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewCatColor(c.hex)}
                          title={c.label}
                          className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                            newCatColor === c.hex
                              ? 'ring-2 ring-offset-2 ring-[#1D63FF] scale-110'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-3 flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCategoryFormOpen(false)}
                      className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-[#1D63FF] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>

                  <div className="sm:col-span-12">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Descrição da Categoria (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Ex: Peças técnicas sob medida produzidas em PETG ou ABS..."
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                    />
                  </div>
                </div>
              </form>
            )}

            {/* Category Selection Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const isSelected = selectedProductCategory === cat.name;
                const prodCount = products.filter((p) => p.category === cat.name).length;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedProductCategory(cat.name);
                      showToast(`Categoria "${cat.name}" selecionada para este produto.`);
                    }}
                    className={`group flex flex-col justify-between rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1D63FF] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#1D63FF] shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: cat.colorHex || '#1D63FF' }}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryToDelete(cat);
                            }}
                            title="Excluir categoria"
                            className="opacity-40 group-hover:opacity-100 hover:text-rose-500 text-slate-400 transition-colors p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-[#1D63FF] shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {cat.description || 'Categoria de peças 3D'}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-800/60 text-[10px]">
                      <span className="text-slate-400">
                        {prodCount} {prodCount === 1 ? 'peça' : 'peças'}
                      </span>
                      {isSelected ? (
                        <span className="font-extrabold text-[#1D63FF]">✓ Selecionada</span>
                      ) : (
                        <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                          Clique para escolher
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add New Category Quick Button */}
              <button
                type="button"
                onClick={() => setIsCategoryFormOpen(true)}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1D63FF] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 p-3 text-center transition-all group cursor-pointer min-h-[85px]"
              >
                <Plus className="h-4 w-4 text-slate-400 group-hover:text-[#1D63FF]" />
                <span className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#1D63FF]">
                  + Nova Categoria
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Dynamic Summary Panel (5 cols on XL)
            User Request:
            - Dark Mode: Royal Blue background (dark:bg-[#1D63FF]) with white/black high-contrast text
            - Light Mode: Black background (bg-[#0D0F14]) with white/high-contrast text
        */}
        <div className="space-y-5 xl:col-span-5">
          {/* GROUP 1: Preço Sugerido Recomendado */}
          <div
            data-testid="summary-group-price"
            className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] border border-slate-800 dark:border-blue-400/30 p-4 sm:p-6 text-white shadow-2xl transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 dark:text-blue-100">
                Preço Sugerido Recomendado ({params.batchQuantity} un)
              </span>
              <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-mono font-bold text-white">
                {params.technology === 'SLA_Resina' ? 'SLA Resina' : 'FDM Filamento'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <div
                  data-testid="suggested-total-price"
                  className="text-4xl font-extrabold tracking-tight tabular-nums text-white"
                >
                  {formatCurrencyBRL(breakdown.totalBatchPrice)}
                </div>
                <div className="mt-1 text-xs text-slate-300 dark:text-blue-100">
                  Preço Unitário Sugerido:{' '}
                  <strong
                    data-testid="suggested-unit-price"
                    className="text-sm font-extrabold text-white underline decoration-white/40 tabular-nums"
                  >
                    {formatCurrencyBRL(breakdown.unitPrice)}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl bg-[#1D63FF] dark:bg-[#0D0F14] px-4 py-2.5 text-right text-white shadow-md">
                <div className="text-[11px] font-semibold text-blue-100 dark:text-slate-300">
                  Lucro Líquido do Lote
                </div>
                <div className="text-lg font-extrabold tabular-nums text-white">
                  +{formatCurrencyBRL(breakdown.totalBatchProfit)}
                </div>
              </div>
            </div>

            {/* Proportion Bar: Custo Total vs. Lucro */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-200 dark:text-white">
                  Custo Real:{' '}
                  <strong className="tabular-nums font-extrabold text-white">
                    {breakdown.costSharePercent}% ({formatCurrencyBRL(breakdown.totalBatchCost)})
                  </strong>
                </span>
                <span className="text-blue-300 dark:text-slate-950 dark:bg-white dark:px-2 dark:py-0.5 dark:rounded-md font-bold">
                  Lucro:{' '}
                  <strong className="tabular-nums">
                    {breakdown.profitSharePercent}% ({formatCurrencyBRL(breakdown.totalBatchProfit)})
                  </strong>
                </span>
              </div>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-800 dark:bg-[#0D0F14]/70 p-0.5">
                <div
                  style={{ width: `${breakdown.costSharePercent}%` }}
                  className="bg-hatch-obsidian h-full rounded-l-full transition-all duration-200"
                  title="Proporção de Custo"
                />
                <div
                  style={{ width: `${breakdown.profitSharePercent}%` }}
                  className="bg-hatch-sky dark:bg-white h-full rounded-r-full transition-all duration-200"
                  title="Proporção de Lucro"
                />
              </div>
            </div>

            {/* 4 Quick Metric Sub-cards */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#161A24] dark:bg-white p-3.5 text-white dark:text-slate-950 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                  Custo Unitário Real
                </div>
                <div className="mt-1 text-base font-extrabold tabular-nums">
                  {formatCurrencyBRL(breakdown.unitCost)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#161A24] dark:bg-white p-3.5 text-white dark:text-slate-950 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                  Lucro Líquido Unitário
                </div>
                <div className="mt-1 text-base font-extrabold tabular-nums text-emerald-400 dark:text-emerald-600">
                  +{formatCurrencyBRL(breakdown.unitProfit)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#161A24] dark:bg-white p-3.5 text-white dark:text-slate-950 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                  Tempo Total do Lote
                </div>
                <div className="mt-1 text-base font-extrabold tabular-nums">
                  {breakdown.totalBatchHours.toFixed(1)} horas
                </div>
              </div>
              <div className="rounded-2xl bg-[#161A24] dark:bg-white p-3.5 text-white dark:text-slate-950 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-600">
                  Custo Bruto Material
                </div>
                <div className="mt-1 text-base font-extrabold tabular-nums">
                  {formatCurrencyBRL(breakdown.materialCostBatch)}
                </div>
              </div>
            </div>

            {/* Primary CTA Buttons: Focused on Creating Products & Registering Direct Sales */}
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                data-testid="btn-summary-create-product"
                onClick={() => setIsCreateProductModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                <PackagePlus className="h-4 w-4 text-[#1D63FF]" />
                Criar Produto desta Peça
              </button>
              <button
                type="button"
                data-testid="btn-summary-register-sale"
                onClick={handleOpenSaleWorkspace}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 py-3 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                <ShoppingCart className="h-4 w-4" />
                Registrar Venda c/ Produtos
              </button>
            </div>
          </div>

          {/* GROUP 2: Anatomia Real do Custo (Blue in Dark Mode, Black in Light Mode) */}
          <div
            data-testid="summary-group-anatomy"
            className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] border border-slate-800 dark:border-blue-400/30 p-6 text-white shadow-2xl transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Anatomia Real do Custo (Por Peça & Lote)
                </h3>
                <p className="text-xs text-slate-300 dark:text-blue-100">
                  Decomposição exata dos 5 pilares de custo da manufatura aditiva
                </p>
              </div>
              <Layers className="h-5 w-5 text-blue-400 dark:text-white" />
            </div>

            <div className="mt-4 divide-y divide-white/15 text-xs">
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-bold text-white">
                    1. Custo de Material
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 dark:text-blue-100">
                    ({params.weightGrams}g / 1000) × R$ {params.filamentPricePerKg}/kg
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.materialCostUnit)} / un
                  </div>
                  <div className="text-[11px] text-slate-300 dark:text-blue-100">
                    Lote: {formatCurrencyBRL(breakdown.materialCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-bold text-white">
                    2. Energia Elétrica
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 dark:text-blue-100">
                    ({params.printerPowerWatts}W / 1000) × {breakdown.printHoursDecimal.toFixed(2)}h × R$ {params.energyRateKwh}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.energyCostUnit)} / un
                  </div>
                  <div className="text-[11px] text-slate-300 dark:text-blue-100">
                    Lote: {formatCurrencyBRL(breakdown.energyCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-bold text-white">
                    3. Depreciação / Amortização da Máquina
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 dark:text-blue-100">
                    (R$ {params.printerCost} / {params.printerLifespanHours}h) × {breakdown.printHoursDecimal.toFixed(2)}h
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.depreciationCostUnit)} / un
                  </div>
                  <div className="text-[11px] text-slate-300 dark:text-blue-100">
                    Lote: {formatCurrencyBRL(breakdown.depreciationCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-bold text-white">
                    4. Mão de Obra Humana (Fatiamento & Pós-Proc.)
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 dark:text-blue-100">
                    {params.laborHours}h × R$ {params.laborHourlyRate}/h
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.laborCostUnit)} / un
                  </div>
                  <div className="text-[11px] text-slate-300 dark:text-blue-100">
                    Lote: {formatCurrencyBRL(breakdown.laborCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-extrabold text-amber-300 dark:text-slate-950 dark:bg-amber-300 dark:px-2 dark:py-0.5 dark:rounded-md inline-block">
                    5. Adicional de Risco de Falha ({params.failureRiskPercent}%)
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-300 dark:text-blue-100">
                    {formatCurrencyBRL(breakdown.baseSubtotalUnit)} × ({params.failureRiskPercent}% / 100)
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-extrabold text-amber-300 dark:text-white">
                    +{formatCurrencyBRL(breakdown.failureRiskCostUnit)} / un
                  </div>
                  <div className="text-[11px] text-slate-300 dark:text-blue-100">
                    Lote: +{formatCurrencyBRL(breakdown.failureRiskCostBatch)}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparative Box: Naive Price vs Real Recommended Price */}
            <div className="mt-4 rounded-2xl bg-[#161A24] dark:bg-white p-4 text-white dark:text-slate-950 shadow-md">
              <div className="text-xs font-extrabold">
                Comparativo: Apenas Peso + Margem vs. Preço Real Recomendado
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 dark:border-slate-200 bg-[#0D0F14] dark:bg-slate-100 p-3">
                  <div className="text-[11px] font-medium text-slate-400 dark:text-slate-600">
                    Se cobrasse só Filamento + {params.profitMarginPercent}%
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-rose-400 dark:text-rose-600">
                    {formatCurrencyBRL(breakdown.naiveWeightOnlyUnitPrice)} / un
                  </div>
                </div>
                <div className="rounded-xl bg-[#1D63FF] dark:bg-[#0D0F14] p-3 text-white">
                  <div className="text-[11px] font-medium text-blue-100 dark:text-slate-300">
                    Preço Real Recomendado
                  </div>
                  <div className="mt-1 text-sm font-extrabold tabular-nums text-white">
                    {formatCurrencyBRL(breakdown.unitPrice)} / un
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-slate-300 dark:text-slate-600">
                Cobrar apenas pelo peso deixaria{' '}
                <strong className="tabular-nums font-extrabold text-white dark:text-slate-950">
                  {formatCurrencyBRL(breakdown.hiddenCostDifferenceBatch)}
                </strong>{' '}
                de custos ocultos (energia, máquina, mão de obra e falhas) descobertos neste lote.
              </p>
            </div>

            {/* ROI Metric */}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#161A24] dark:bg-[#0D0F14] px-4 py-3.5 text-xs text-white shadow-md">
              <div>
                <div className="font-extrabold">Payback / ROI da Impressora</div>
                <div className="text-[11px] text-slate-300">
                  Máquina avaliada em {formatCurrencyBRL(params.printerCost)}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-sm font-extrabold text-emerald-400">
                  {breakdown.unitsToPayPrinter} peças
                </div>
                <div className="text-[11px] text-slate-300">
                  ou {breakdown.batchesToPayPrinter} lotes iguais a este
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Catalog & Direct Sales Workspace inside Calculator */}
      <ProductSalesWorkspace
        currentCalcParams={params}
        currentBreakdown={breakdown}
        products={products}
        categories={categories}
        selectedCategory={selectedProductCategory}
        sales={sales}
        onCreateProduct={onCreateProduct}
        onDeleteProduct={onDeleteProduct}
        onLoadProductIntoCalculator={handleLoadProductIntoCalculator}
        onRegisterSale={onRegisterSale}
        onDeleteSale={onDeleteSale}
        onNavigateToCashflow={onNavigateToCashflow}
        isCreateProductModalOpen={isCreateProductModalOpen}
        setIsCreateProductModalOpen={setIsCreateProductModalOpen}
        isRegisterSaleModalOpen={isRegisterSaleModalOpen}
        setIsRegisterSaleModalOpen={setIsRegisterSaleModalOpen}
      />

      {/* Category Deletion Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Excluir Categoria"
        description="Tem certeza que deseja excluir esta categoria? Os produtos cadastrados nela manterão seus dados, mas a categoria será removida do catálogo."
        itemLabel={categoryToDelete?.name}
        confirmLabel="Sim, Excluir Categoria"
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete.id);
            showToast(`Categoria "${categoryToDelete.name}" excluída.`);
            setCategoryToDelete(null);
          }
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};
