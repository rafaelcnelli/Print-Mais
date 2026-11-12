import React, { useMemo, useState } from 'react';
import {
  CalculatorParams,
  ExtraSupplyRecord,
  ExtraSupplyUsage,
  MarketplacePriceSummary,
  MarketplaceSimulationConfig,
  ProductCategoryRecord,
  ProductRecord,
  SaleRecord,
  SpoolRecord,
} from '../types';
import {
  CALCULATOR_PRESETS,
  calculate3DPrintPricing,
  calculateMarketplaceGrossUp,
  formatCurrencyBRL,
} from '../utils/pricing';
import { ProductSalesWorkspace } from './ProductSalesWorkspace';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  HelpCircle,
  Layers,
  Minus,
  Package,
  PackagePlus,
  Percent,
  Plus,
  Scale,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
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
  extraSupplies?: ExtraSupplyRecord[];
}

export interface MarketplaceItemConfig {
  platform: 'shopee' | 'mercadoLivre' | 'amazon';
  platformName: string;
  commissionPercent: number;
  fixedFee: number;
  enabled: boolean;
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
  extraSupplies = [],
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

  // Marketplace Simulation State
  const [marketplaceConfigs, setMarketplaceConfigs] = useState<MarketplaceItemConfig[]>([
    {
      platform: 'shopee',
      platformName: 'Shopee',
      commissionPercent: 20,
      fixedFee: 4.0,
      enabled: false,
    },
    {
      platform: 'mercadoLivre',
      platformName: 'Mercado Livre (Clássico/Premium)',
      commissionPercent: 16,
      fixedFee: 6.0,
      enabled: false,
    },
    {
      platform: 'amazon',
      platformName: 'Amazon Brasil',
      commissionPercent: 15,
      fixedFee: 2.0,
      enabled: false,
    },
  ]);

  // Extra Supplies selector modal state
  const [isSupplySelectorOpen, setIsSupplySelectorOpen] = useState(false);
  const [selectedSupplyIdToAdd, setSelectedSupplyIdToAdd] = useState<string>('');
  const [selectedSupplyQtyToAdd, setSelectedSupplyQtyToAdd] = useState<string>('1');
  // Collapsible Section States
  const [isExtraSuppliesExpanded, setIsExtraSuppliesExpanded] = useState(
    Boolean(params.extraSupplies && params.extraSupplies.length > 0)
  );
  const [isMarketplacesExpanded, setIsMarketplacesExpanded] = useState(false);

  const breakdown = useMemo(() => calculate3DPrintPricing(params), [params]);

  // Real-time Gross-up Marketplaces
  const marketplaceSummaries = useMemo(() => {
    return marketplaceConfigs
      .filter((cfg) => cfg.enabled)
      .map((cfg) =>
        calculateMarketplaceGrossUp(
          breakdown.unitPrice,
          cfg.commissionPercent,
          cfg.fixedFee,
          cfg.platform,
          cfg.platformName
        )
      );
  }, [marketplaceConfigs, breakdown.unitPrice]);

  const showToast = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3200);
  };

  const handleAddSupplyToPiece = () => {
    if (!selectedSupplyIdToAdd) return;
    const target = extraSupplies.find((s) => s.id === selectedSupplyIdToAdd);
    if (!target) return;
    const qty = Math.max(1, parseInt(selectedSupplyQtyToAdd, 10) || 1);

    const currentList = params.extraSupplies || [];
    const existingIdx = currentList.findIndex((item) => item.supplyId === target.id);
    let updated: ExtraSupplyUsage[];
    if (existingIdx >= 0) {
      updated = currentList.map((item, idx) =>
        idx === existingIdx
          ? {
              ...item,
              quantity: item.quantity + qty,
              totalCost: (item.quantity + qty) * item.unitCost,
            }
          : item
      );
    } else {
      updated = [
        ...currentList,
        {
          supplyId: target.id,
          name: target.nome || target.name || 'Insumo',
          category: (target.categoria || target.category || 'Outros') as string,
          quantity: qty,
          unitCost: target.custoUnitario,
          totalCost: qty * target.custoUnitario,
        },
      ];
    }
    onChangeParams({ ...params, extraSupplies: updated });
    setIsSupplySelectorOpen(false);
    setSelectedSupplyIdToAdd('');
    setSelectedSupplyQtyToAdd('1');
    showToast(`Insumo "${target.nome || target.name}" (${qty} un) adicionado aos custos!`);
  };

  const handleRemoveSupply = (supplyId: string) => {
    const updated = (params.extraSupplies || []).filter((s) => s.supplyId !== supplyId);
    onChangeParams({ ...params, extraSupplies: updated });
  };

  const handleUpdateSupplyQty = (supplyId: string, nextQty: number) => {
    if (nextQty <= 0) {
      handleRemoveSupply(supplyId);
      return;
    }
    const updated = (params.extraSupplies || []).map((s) =>
      s.supplyId === supplyId
        ? { ...s, quantity: nextQty, totalCost: nextQty * s.unitCost }
        : s
    );
    onChangeParams({ ...params, extraSupplies: updated });
  };

  const handleToggleMarketplace = (platform: 'shopee' | 'mercadoLivre' | 'amazon') => {
    setMarketplaceConfigs((prev) =>
      prev.map((cfg) =>
        cfg.platform === platform ? { ...cfg, enabled: !cfg.enabled } : cfg
      )
    );
  };

  const handleUpdateMarketplaceConfig = (
    platform: 'shopee' | 'mercadoLivre' | 'amazon',
    commissionPercent: number,
    fixedFee: number
  ) => {
    setMarketplaceConfigs((prev) =>
      prev.map((cfg) =>
        cfg.platform === platform
          ? {
              ...cfg,
              commissionPercent: Math.max(0, commissionPercent),
              fixedFee: Math.max(0, fixedFee),
            }
          : cfg
      )
    );
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

  const handleNumericChange = (
    field: keyof CalculatorParams,
    rawValue: string | number
  ) => {
    const parsed =
      typeof rawValue === 'number'
        ? rawValue
        : rawValue === ''
        ? 0
        : parseFloat(rawValue);
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

      {/* Main Layout with Fixed Right Sidebar on XL */}
      <div className="space-y-6">
        {/* LEFT COLUMN: Parameter Form */}
        <div className="space-y-3.5">
          {/* Card 0: Identificação do Produto & Tecnologia */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Identificação da Peça & Tecnologia
              </h3>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeParams({ ...params, technology: 'FDM' })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.technology === 'FDM'
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  FDM (Filamento)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeParams({ ...params, technology: 'SLA_Resina' })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.technology === 'SLA_Resina'
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  SLA (Resina)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="calc-project-name"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-client-name"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  Linha / Referência
                </label>
                <input
                  id="calc-client-name"
                  type="text"
                  value={params.clientName}
                  onChange={(e) =>
                    onChangeParams({ ...params, clientName: e.target.value })
                  }
                  placeholder="Ex: Linha Industrial / Gamer"
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Presets:
              </span>
              {CALCULATOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChangeParams({
                      ...params,
                      ...preset.params,
                      batchQuantity: params.batchQuantity || 1,
                    });
                    showToast(`Preset "${preset.name}" aplicado!`);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                    params.presetId === preset.id
                      ? 'bg-[#1D63FF] text-white border-[#1D63FF] shadow-xs'
                      : 'bg-slate-100 dark:bg-[#0D0F14] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-[#1D63FF]'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Card 1: Material e Tempo */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#1D63FF] shrink-0">
                  <Scale className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  1. Material e Tempo de Impressão
                </h3>
              </div>

              {spools.length > 0 && (
                <div className="w-full sm:w-auto">
                  <select
                    aria-label="Vincular preço de bobina do estoque"
                    onChange={(e) => handleSpoolSelect(e.target.value)}
                    defaultValue=""
                    className="w-full sm:w-auto max-w-full truncate rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0D0F14] px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:border-[#1D63FF] focus:outline-none cursor-pointer"
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

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div>
                <label
                  htmlFor="input-weight-grams"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  Peso total (g)
                </label>
                <input
                  id="input-weight-grams"
                  type="number"
                  min={0}
                  step={1}
                  value={params.weightGrams}
                  onChange={(e) => handleNumericChange('weightGrams', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-filament-price"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  Preço do kg (R$)
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
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-print-hours"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  Tempo (Horas)
                </label>
                <input
                  id="input-print-hours"
                  type="number"
                  min={0}
                  step={1}
                  value={params.printTimeHours}
                  onChange={(e) => handleNumericChange('printTimeHours', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="input-print-minutes"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  Minutos adic.
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
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Compact Metric Strip */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>⚡ Potência:</span>
                <input
                  id="input-power-watts"
                  type="number"
                  min={0}
                  step={10}
                  value={params.printerPowerWatts}
                  onChange={(e) =>
                    handleNumericChange('printerPowerWatts', e.target.value)
                  }
                  className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2 py-0.5 text-[11px] font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                />
                <span>W</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Tempo Decimal: <strong className="font-mono text-slate-800 dark:text-white">{breakdown.printHoursDecimal.toFixed(2)} h/un</strong></span>
                <span>Custo Material: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrencyBRL(breakdown.materialCostUnit)}/un</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2 & 3: Operação, Desgaste e Mão de Obra (Compact 2-col) */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {/* Operação e Desgaste */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                    <Zap className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      2. Operação & Desgaste
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Energia elétrica e amortização
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="input-energy-rate"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Energia (R$/kWh)
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
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-printer-cost"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Máquina (R$)
                  </label>
                  <input
                    id="input-printer-cost"
                    type="number"
                    min={0}
                    step={100}
                    value={params.printerCost}
                    onChange={(e) => handleNumericChange('printerCost', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-printer-lifespan"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Vida Útil (h)
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
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Depreciação: <strong className="font-mono text-slate-700 dark:text-slate-300">R$ {(params.printerLifespanHours > 0 ? params.printerCost / params.printerLifespanHours : 0).toFixed(2)}/h</strong></span>
                <span>Energia Unitária: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrencyBRL(breakdown.energyCostUnit)}</strong></span>
              </div>
            </div>

            {/* Mão de Obra e Setup */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Wrench className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      3. Mão de Obra & Lote
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Setup, pós-processamento e escala
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="input-labor-rate"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Hora Humana (R$/h)
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
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-labor-hours"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Horas Setup/un
                  </label>
                  <input
                    id="input-labor-hours"
                    type="number"
                    min={0}
                    step={0.05}
                    value={params.laborHours}
                    onChange={(e) => handleNumericChange('laborHours', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-batch-qty"
                    className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Qtd Lote (un)
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
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>Trabalho Manual/un: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrencyBRL(breakdown.laborCostUnit)}</strong></span>
                <span>Lote Total: <strong className="font-mono text-slate-900 dark:text-white">{params.batchQuantity} unidades</strong></span>
              </div>
            </div>
          </div>

          {/* Card 4: Margem de Lucro & Taxa de Risco Operacional (Compact) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#1D63FF] shrink-0">
                <Percent className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  4. Margem de Lucro & Taxa de Risco
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Defina o retorno sobre o custo e a reserva para perdas/reimpressões
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Profit Margin Slider */}
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="slider-profit-margin"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-200"
                  >
                    Margem de Lucro
                  </label>
                  <span className="text-sm font-extrabold tabular-nums text-[#1D63FF]">
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
                  className="mt-2 h-1.5 w-full cursor-pointer rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between gap-1">
                  {[30, 50, 75, 100, 150].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleNumericChange('profitMarginPercent', pct)}
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                        params.profitMarginPercent === pct
                          ? 'bg-[#1D63FF] text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Failure Risk Slider */}
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="slider-failure-risk"
                    className="text-[11px] font-bold text-slate-700 dark:text-slate-200"
                  >
                    Risco de Falha / Perda
                  </label>
                  <span className="text-sm font-extrabold tabular-nums text-amber-500">
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
                  className="mt-2 h-1.5 w-full cursor-pointer rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between gap-1">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleNumericChange('failureRiskPercent', pct)}
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                        params.failureRiskPercent === pct
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Escolher Categoria do Produto (Compact Wrap Pill Design) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#1D63FF] shrink-0">
                  <Tags className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    5. Categoria do Produto
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Classifique esta peça no catálogo de vendas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryFormOpen(!isCategoryFormOpen)}
                  data-testid="btn-open-category-form-item5"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0D0F14] px-2.5 py-1 text-[11px] font-bold text-[#1D63FF] hover:border-[#1D63FF] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FolderPlus className="h-3 w-3" />
                  {isCategoryFormOpen ? 'Fechar' : '+ Nova Categoria'}
                </button>
              </div>
            </div>

            {/* Inline Category Registration Form if expanded */}
            {isCategoryFormOpen && (
              <form
                onSubmit={handleSaveCategory}
                className="mt-3 rounded-xl border-2 border-dashed border-[#1D63FF]/50 bg-blue-50/50 dark:bg-blue-950/20 p-3 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <FolderPlus className="h-3.5 w-3.5 text-[#1D63FF]" />
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Cadastrar Categoria
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {catError && (
                  <div className="mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-1.5 text-[11px] text-rose-500 font-semibold">
                    {catError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nome (Ex: Cosplay, Peças Técnicas...)"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14] px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="sm:col-span-4 flex items-center gap-1.5 flex-wrap">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewCatColor(c.hex)}
                        title={c.label}
                        className={`h-5 w-5 rounded-full transition-transform cursor-pointer ${
                          newCatColor === c.hex
                            ? 'ring-2 ring-offset-1 ring-[#1D63FF] scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>

                  <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                    <button
                      type="submit"
                      className="rounded-full bg-[#1D63FF] px-3 py-1 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Compact Category Pill Cloud */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              {categories.map((cat) => {
                const isSelected = selectedProductCategory === cat.name;
                const prodCount = products.filter((p) => p.category === cat.name).length;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedProductCategory(cat.name);
                      showToast(`Categoria "${cat.name}" selecionada.`);
                    }}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1D63FF] bg-[#1D63FF]/15 text-[#1D63FF] dark:text-blue-300 font-extrabold ring-1 ring-[#1D63FF]'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.colorHex || '#1D63FF' }}
                    />
                    <span>{cat.name}</span>
                    {prodCount > 0 && (
                      <span className="rounded-full bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                        {prodCount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(cat);
                      }}
                      title="Excluir categoria"
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 transition-opacity p-0.5"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 6: Insumos Extras / Componentes (Collapsible Accordion) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsExtraSuppliesExpanded(!isExtraSuppliesExpanded)}
                className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-[#1D63FF] shrink-0">
                  <Boxes className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      6. 🔩 Insumos Extras / Componentes
                    </h3>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {(params.extraSupplies?.length || 0) > 0
                        ? `${params.extraSupplies!.length} un (+${formatCurrencyBRL(breakdown.extraSuppliesCostUnit)})`
                        : 'Opcional'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Ímãs, parafusos, argolas e embalagens somados ao custo de produção
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsExtraSuppliesExpanded(true);
                    setIsSupplySelectorOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1D63FF] px-2.5 py-1 text-[11px] font-extrabold text-white hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-3 w-3" />
                  + Insumo
                </button>
                <button
                  type="button"
                  onClick={() => setIsExtraSuppliesExpanded(!isExtraSuppliesExpanded)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={isExtraSuppliesExpanded ? 'Recolher insumos' : 'Expandir insumos'}
                >
                  {isExtraSuppliesExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isExtraSuppliesExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {(!params.extraSupplies || params.extraSupplies.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-3 text-center bg-slate-50/50 dark:bg-[#0D0F14]/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nenhum insumo extra vinculado a esta peça.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSupplySelectorOpen(true)}
                      className="mt-1.5 text-xs font-bold text-[#1D63FF] hover:underline cursor-pointer"
                    >
                      + Selecionar do estoque de insumos
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {params.extraSupplies.map((item) => (
                        <div
                          key={item.supplyId}
                          className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] p-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[9px] font-bold text-[#1D63FF] dark:text-blue-300">
                                {item.category || 'Componente'}
                              </span>
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {item.name}
                              </h4>
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              Unitário: {formatCurrencyBRL(item.unitCost)} · Total na peça: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrencyBRL(item.totalCost)}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F] px-2 py-0.5">
                              <label className="text-[9px] font-bold text-slate-400">Qtd:</label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateSupplyQty(
                                    item.supplyId,
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  )
                                }
                                className="w-10 text-center font-mono text-xs font-black text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSupply(item.supplyId)}
                              title="Remover insumo"
                              className="rounded p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Custo Total Insumos / un:</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        +{formatCurrencyBRL(breakdown.extraSuppliesCostUnit)}
                        {params.batchQuantity > 1 && (
                          <span className="ml-1 text-[10px] font-normal text-slate-400">
                            ({formatCurrencyBRL(breakdown.extraSuppliesCostBatch)} no lote)
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Card 7: Simulador de Taxas de Marketplaces (Collapsible Accordion) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsMarketplacesExpanded(!isMarketplacesExpanded)}
                className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
                  <Store className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      7. 🛒 Simular Preço Marketplaces
                    </h3>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {marketplaceSummaries.length > 0
                        ? `${marketplaceSummaries.length} canais ativos`
                        : 'Opcional'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Cálculo reverso <em>(Gross-up)</em> para cobrir comissão e taxa fixa sem perder margem líquida
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsMarketplacesExpanded(!isMarketplacesExpanded)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                aria-label={isMarketplacesExpanded ? 'Recolher simulador' : 'Expandir simulador'}
              >
                {isMarketplacesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {isMarketplacesExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Checklist of Marketplaces with Inline Fee Editors */}
                <div className="space-y-2">
                  {marketplaceConfigs.map((cfg) => {
                    const isShopee = cfg.platform === 'shopee';
                    const isML = cfg.platform === 'mercadoLivre';

                    return (
                      <div
                        key={cfg.platform}
                        className={`rounded-xl border p-2.5 transition-all ${
                          cfg.enabled
                            ? isShopee
                              ? 'border-orange-500/80 bg-orange-50/20 dark:bg-orange-950/10'
                              : isML
                              ? 'border-yellow-500/80 bg-yellow-50/20 dark:bg-yellow-950/10'
                              : 'border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/10'
                            : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0D0F14]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {/* Checkbox & Brand */}
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={() => handleToggleMarketplace(cfg.platform)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D63FF] focus:ring-[#1D63FF]"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {isShopee ? '🟠' : isML ? '🟡' : '📦'}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {cfg.platformName}
                              </span>
                            </div>
                          </label>

                          {/* Inline editable fee parameters */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <div className="flex items-center gap-1">
                              <label className="text-[9px] font-bold text-slate-500">Comissão:</label>
                              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F] px-1.5 py-0.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={60}
                                  step={1}
                                  value={cfg.commissionPercent}
                                  onChange={(e) =>
                                    handleUpdateMarketplaceConfig(
                                      cfg.platform,
                                      parseFloat(e.target.value) || 0,
                                      cfg.fixedFee
                                    )
                                  }
                                  className="w-8 text-center font-mono text-[11px] font-extrabold text-slate-900 dark:text-white focus:outline-none"
                                />
                                <span className="text-[9px] font-bold text-slate-400">%</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <label className="text-[9px] font-bold text-slate-500">Taxa Fixa:</label>
                              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F] px-1.5 py-0.5">
                                <span className="text-[9px] font-bold text-slate-400">R$</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={cfg.fixedFee}
                                  onChange={(e) =>
                                    handleUpdateMarketplaceConfig(
                                      cfg.platform,
                                      cfg.commissionPercent,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-10 text-center font-mono text-[11px] font-extrabold text-slate-900 dark:text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculated Marketplace Cards */}
                {marketplaceSummaries.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <h4 className="font-extrabold text-slate-900 dark:text-white">
                        🎯 Preços Sugeridos para Anúncio:
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Base direta: {formatCurrencyBRL(breakdown.unitPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {marketplaceSummaries.map((summary) => {
                        const isShopee = summary.platform === 'shopee';
                        const isML = summary.platform === 'mercadoLivre';

                        return (
                          <div
                            key={summary.platform}
                            className={`rounded-xl border p-3 shadow-xs flex flex-col justify-between ${
                              isShopee
                                ? 'border-orange-500/80 bg-orange-50/15 dark:bg-orange-950/20'
                                : isML
                                ? 'border-yellow-500/80 bg-yellow-50/15 dark:bg-yellow-950/20'
                                : 'border-blue-500/80 bg-blue-50/15 dark:bg-blue-950/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                                    isShopee
                                      ? 'bg-[#EE4D2D] text-white'
                                      : isML
                                      ? 'bg-[#FFE600] text-slate-900 font-black'
                                      : 'bg-[#FF9900] text-slate-950 font-black'
                                  }`}
                                >
                                  {summary.platformName}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">
                                  {summary.commissionPercent}% + {formatCurrencyBRL(summary.fixedFee)}
                                </span>
                              </div>

                              <div className="mt-2">
                                <div className="text-[9px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                                  Preço Sugerido Anúncio
                                </div>
                                <div className="mt-0.5 font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                  {formatCurrencyBRL(summary.listingPrice)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-0.5 text-[10px]">
                              <div className="flex justify-between text-rose-500">
                                <span>Taxas plataforma:</span>
                                <span className="font-mono">-{formatCurrencyBRL(summary.feeAmount)}</span>
                              </div>
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                                <span>Lucro garantido:</span>
                                <span className="font-mono">+{formatCurrencyBRL(breakdown.unitProfit)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FIXED FULL-HEIGHT RIGHT SIDEBAR: Preço Sugerido + Anatomia Real do Custo (Only on Calculator page, Darker Navy Blue Background) */}
        <aside
          aria-label="Barra lateral de Preço Sugerido e Anatomia do Custo"
          data-testid="calculator-right-sidebar"
          className="rounded-3xl xl:rounded-none bg-[#0B1526] dark:bg-[#0D2146] text-white border border-slate-800 dark:border-blue-900/60 xl:border-y-0 xl:border-r-0 xl:border-l xl:border-slate-800/90 dark:xl:border-blue-900/50 p-5 xl:px-5 xl:py-5 xl:fixed xl:top-0 xl:right-0 xl:bottom-0 xl:z-40 xl:w-[380px] 2xl:w-[410px] xl:h-screen xl:overflow-hidden flex flex-col gap-4 shadow-2xl transition-colors"
        >
          {/* GROUP 1: Preço Sugerido Recomendado */}
          <div
            data-testid="summary-group-price"
            className="flex flex-col gap-3 shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 dark:text-blue-100">
                Preço Sugerido Recomendado ({params.batchQuantity} un)
              </span>
              <span className="rounded-full bg-white/15 dark:bg-black/40 border border-transparent dark:border-white/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-white shrink-0">
                {params.technology === 'SLA_Resina' ? 'SLA Resina' : 'FDM Filamento'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div
                  data-testid="suggested-total-price"
                  className="text-3xl 2xl:text-4xl font-extrabold tracking-tight tabular-nums text-white leading-none"
                >
                  {formatCurrencyBRL(breakdown.totalBatchPrice)}
                </div>
                <div className="mt-1.5 text-xs text-slate-300 dark:text-blue-100">
                  Preço Unitário Sugerido:{' '}
                  <strong
                    data-testid="suggested-unit-price"
                    className="text-sm font-extrabold text-white underline decoration-white/40 tabular-nums"
                  >
                    {formatCurrencyBRL(breakdown.unitPrice)}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl bg-[#1D63FF] dark:bg-[#071326] dark:border dark:border-blue-400/30 px-3.5 py-2 text-right text-white shadow-sm shrink-0">
                <div className="text-[10px] font-semibold text-blue-100 dark:text-slate-300 leading-tight">
                  Lucro Líquido do Lote
                </div>
                <div className="mt-0.5 text-base 2xl:text-lg font-extrabold tabular-nums text-white dark:text-emerald-400 leading-tight">
                  +{formatCurrencyBRL(breakdown.totalBatchProfit)}
                </div>
              </div>
            </div>

            {/* Proportion Bar: Custo Total vs. Lucro */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-200 dark:text-white">
                  Custo Real:{' '}
                  <strong className="tabular-nums font-extrabold text-white">
                    {breakdown.costSharePercent}% ({formatCurrencyBRL(breakdown.totalBatchCost)})
                  </strong>
                </span>
                <span className="text-blue-300 dark:text-white font-bold">
                  Lucro:{' '}
                  <strong className="tabular-nums">
                    {breakdown.profitSharePercent}% ({formatCurrencyBRL(breakdown.totalBatchProfit)})
                  </strong>
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-900/90 dark:bg-black/50 dark:border dark:border-white/15 p-0.5">
                <div
                  style={{ width: `${breakdown.costSharePercent}%` }}
                  className="bg-hatch-obsidian h-full rounded-l-full transition-all duration-200"
                  title="Proporção de Custo"
                />
                <div
                  style={{ width: `${breakdown.profitSharePercent}%` }}
                  className="bg-hatch-sky h-full rounded-r-full transition-all duration-200"
                  title="Proporção de Lucro"
                />
              </div>
            </div>

            {/* 4 Quick Metric Sub-cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 px-3 py-2.5 text-white shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 leading-tight">
                  Custo Unitário Real
                </div>
                <div className="mt-1 text-sm font-extrabold tabular-nums leading-tight text-white">
                  {formatCurrencyBRL(breakdown.unitCost)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 px-3 py-2.5 text-white shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 leading-tight">
                  Lucro Líquido Unitário
                </div>
                <div className="mt-1 text-sm font-extrabold tabular-nums text-emerald-400 dark:text-emerald-300 leading-tight">
                  +{formatCurrencyBRL(breakdown.unitProfit)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 px-3 py-2.5 text-white shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 leading-tight">
                  Tempo Total do Lote
                </div>
                <div className="mt-1 text-sm font-extrabold tabular-nums leading-tight text-white">
                  {breakdown.totalBatchHours.toFixed(1)} horas
                </div>
              </div>
              <div className="rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 px-3 py-2.5 text-white shadow-xs">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 leading-tight">
                  Custo Bruto Material
                </div>
                <div className="mt-1 text-sm font-extrabold tabular-nums leading-tight text-white">
                  {formatCurrencyBRL(breakdown.materialCostBatch)}
                </div>
              </div>
            </div>

            {/* Primary CTA Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="btn-summary-create-product"
                onClick={() => setIsCreateProductModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2.5 text-[11px] font-extrabold text-slate-950 hover:bg-slate-100 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              >
                <PackagePlus className="h-3.5 w-3.5 text-[#1D63FF] shrink-0" />
                <span>Criar Produto desta Peça</span>
              </button>
              <button
                type="button"
                data-testid="btn-summary-register-sale"
                onClick={handleOpenSaleWorkspace}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 px-3 py-2.5 text-[11px] font-extrabold text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              >
                <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                <span>Registrar Venda</span>
              </button>
            </div>
          </div>

          {/* GROUP 2: Anatomia Real do Custo (Expands naturally to fill remaining height without empty gaps) */}
          <div
            data-testid="summary-group-anatomy"
            className="flex-1 flex flex-col justify-between gap-2.5 pt-4 border-t border-slate-800/90 dark:border-blue-900/60 min-h-0"
          >
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-sm font-extrabold text-white leading-tight">
                  Anatomia Real do Custo (Por Peça & Lote)
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-blue-100 leading-tight">
                  Decomposição exata dos 5 pilares de custo da manufatura aditiva
                </p>
              </div>
              <Layers className="h-4 w-4 text-blue-400 dark:text-white shrink-0" />
            </div>

            <div className="flex-1 flex flex-col justify-evenly divide-y divide-white/10 dark:divide-white/15 text-xs min-h-0">
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-bold text-white leading-tight">
                    1. Custo de Material
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight">
                    ({params.weightGrams}g / 1000) × R$ {params.filamentPricePerKg}/kg
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.materialCostUnit)} / un
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                    Lote: {formatCurrencyBRL(breakdown.materialCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-bold text-white leading-tight">
                    2. Energia Elétrica
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight">
                    ({params.printerPowerWatts}W / 1000) × {breakdown.printHoursDecimal.toFixed(2)}h × R$ {params.energyRateKwh}
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.energyCostUnit)} / un
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                    Lote: {formatCurrencyBRL(breakdown.energyCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-bold text-white leading-tight">
                    3. Depreciação / Amortização da Máquina
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight">
                    (R$ {params.printerCost} / {params.printerLifespanHours}h) × {breakdown.printHoursDecimal.toFixed(2)}h
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.depreciationCostUnit)} / un
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                    Lote: {formatCurrencyBRL(breakdown.depreciationCostBatch)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-bold text-white leading-tight">
                    4. Mão de Obra Humana (Fatiamento & Pós-Proc.)
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight">
                    {params.laborHours}h × R$ {params.laborHourlyRate}/h
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.laborCostUnit)} / un
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                    Lote: {formatCurrencyBRL(breakdown.laborCostBatch)}
                  </div>
                </div>
              </div>

              {/* Insumos Extras / Componentes / Embalagens */}
              {breakdown.extraSuppliesCostUnit > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-white leading-tight truncate">
                      🔩 Insumos Extras / Componentes
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight truncate">
                      {(params.extraSupplies || []).map((s) => `${s.quantity}x ${s.name}`).join(' + ')}
                    </div>
                  </div>
                  <div className="text-right tabular-nums leading-tight shrink-0">
                    <div className="font-extrabold text-white">
                      +{formatCurrencyBRL(breakdown.extraSuppliesCostUnit)} / un
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                      Lote: +{formatCurrencyBRL(breakdown.extraSuppliesCostBatch)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-extrabold text-amber-300 dark:text-amber-200 leading-tight">
                    5. Adicional de Risco de Falha ({params.failureRiskPercent}%)
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-blue-100/80 leading-tight">
                    {formatCurrencyBRL(breakdown.baseSubtotalUnit)} × ({params.failureRiskPercent}% / 100)
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="font-extrabold text-amber-300 dark:text-amber-200">
                    +{formatCurrencyBRL(breakdown.failureRiskCostUnit)} / un
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-blue-100/80">
                    Lote: +{formatCurrencyBRL(breakdown.failureRiskCostBatch)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Cards Wrapper (Comparativo + ROI) */}
            <div className="space-y-2.5 shrink-0">
              {/* Comparative Box: Naive Price vs Real Recommended Price */}
              <div className="rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 p-3 text-white">
                <div className="text-[11px] font-extrabold leading-tight text-white">
                  Comparativo: Apenas Peso + Margem vs. Preço Real Recomendado
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 dark:border-white/15 bg-[#09111E] dark:bg-black/50 px-3 py-2">
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-300 leading-tight">
                      Só Filamento + {params.profitMarginPercent}%
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-extrabold tabular-nums text-rose-400 dark:text-rose-300 leading-tight">
                      {formatCurrencyBRL(breakdown.naiveWeightOnlyUnitPrice)} / un
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#1D63FF] dark:bg-white px-3 py-2 text-white dark:text-slate-950 shadow-sm">
                    <div className="text-[10px] font-bold text-blue-100 dark:text-[#1D63FF] leading-tight">
                      Preço Real Recomendado
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-extrabold tabular-nums text-white dark:text-slate-950 leading-tight">
                      {formatCurrencyBRL(breakdown.unitPrice)} / un
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-300 dark:text-blue-100 leading-snug">
                  Cobrar apenas pelo peso deixaria{' '}
                  <strong className="tabular-nums font-extrabold text-white">
                    {formatCurrencyBRL(breakdown.hiddenCostDifferenceBatch)}
                  </strong>{' '}
                  de custos ocultos descobertos neste lote.
                </p>
              </div>

              {/* ROI Metric */}
              <div className="flex items-center justify-between rounded-2xl bg-[#122036] dark:bg-[#071326] border border-white/10 dark:border-blue-400/20 px-3.5 py-2.5 text-white">
                <div>
                  <div className="text-xs font-extrabold leading-tight text-white">
                    Payback / ROI da Impressora
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-300 leading-tight">
                    Máquina avaliada em {formatCurrencyBRL(params.printerCost)}
                  </div>
                </div>
                <div className="text-right tabular-nums leading-tight">
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-400 dark:text-emerald-300">
                    {breakdown.unitsToPayPrinter} peças
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-300">
                    ou {breakdown.batchesToPayPrinter} lotes iguais
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
        marketplaceSummaries={marketplaceSummaries}
      />

      {/* Modal to pick Extra Supply for piece */}
      {isSupplySelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#14171F] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔩</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Vincular Insumo Extra à Peça
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplySelectorOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selecione o Insumo Cadastrado:
                </label>
                {extraSupplies.length === 0 ? (
                  <p className="mt-2 text-xs text-amber-500 font-bold">
                    Nenhum insumo extra cadastrado no estoque ainda. Cadastre na aba Estoque &gt; Insumos Extras.
                  </p>
                ) : (
                  <select
                    value={selectedSupplyIdToAdd}
                    onChange={(e) => setSelectedSupplyIdToAdd(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Escolha um insumo...</option>
                    {extraSupplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category}) — {formatCurrencyBRL(s.custoUnitario)}/{s.unit || 'un'} · Saldo: {s.estoqueAtual}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quantidade usada por unidade desta peça:
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={selectedSupplyQtyToAdd}
                  onChange={(e) => setSelectedSupplyQtyToAdd(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSupplySelectorOpen(false)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedSupplyIdToAdd}
                  onClick={handleAddSupplyToPiece}
                  className="rounded-full bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white disabled:opacity-40 hover:bg-blue-600 transition-colors"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
