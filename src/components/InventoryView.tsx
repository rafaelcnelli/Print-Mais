import React, { useMemo, useState } from 'react';
import { ExtraSupplyRecord, MaterialType, SpoolRecord } from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ExtraSuppliesManager } from './ExtraSuppliesManager';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Disc,
  Edit3,
  Layers,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

export const FAMOUS_FILAMENT_BRANDS = [
  'Voolt3D',
  'Bambu Lab',
  'eSUN',
  'Creality',
  'GTMax3D',
  '3D Prime',
  'F3D',
  'Sunlu',
  'Polymaker',
  'National 3D',
  'Masterprint',
  'Cliever',
  'Elegoo',
  'Anycubic',
  'Phrozen',
  'Prusament',
  'Genérico',
] as const;

interface InventoryViewProps {
  spools: SpoolRecord[];
  onAddSpool: (
    spool: Omit<SpoolRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onUpdateSpoolWeight: (spoolId: string, nextWeightGrams: number) => void;
  onUpdateSpool?: (updatedSpool: SpoolRecord) => void;
  onDeleteSpool: (spoolId: string) => void;
  extraSupplies?: ExtraSupplyRecord[];
  onAddExtraSupply?: (
    supply: Omit<ExtraSupplyRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onUpdateExtraSupply?: (supply: ExtraSupplyRecord) => void;
  onUpdateExtraSupplyStock?: (supplyId: string, nextStock: number) => void;
  onDeleteExtraSupply?: (supplyId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  spools,
  onAddSpool,
  onUpdateSpoolWeight,
  onUpdateSpool,
  onDeleteSpool,
  extraSupplies = [],
  onAddExtraSupply,
  onUpdateExtraSupply,
  onUpdateExtraSupplyStock,
  onDeleteExtraSupply,
}) => {
  const [activeTab, setActiveTab] = useState<'spools' | 'extraSupplies'>('spools');
  const [spoolName, setSpoolName] = useState('');
  const [spoolBrand, setSpoolBrand] = useState<string>('Voolt3D');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [spoolMaterial, setSpoolMaterial] = useState<MaterialType>('PLA');
  const [spoolColorName, setSpoolColorName] = useState('Preto Ônix');
  const [spoolColorHex, setSpoolColorHex] = useState('#1D63FF');

  // Support for > 1kg of the same filament (quantity of 1kg spools/bottles + unit/total weight)
  const [spoolQuantityKg, setSpoolQuantityKg] = useState<number>(1);
  const [unitPricePerKg, setUnitPricePerKg] = useState<string>('115');
  const [spoolInitialWeight, setSpoolInitialWeight] = useState('1000');
  const [spoolRemainingWeight, setSpoolRemainingWeight] = useState('1000');
  const [spoolPricePaid, setSpoolPricePaid] = useState('115');
  const [spoolMinAlert, setSpoolMinAlert] = useState('200');
  const [spoolError, setSpoolError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Edit Spool Modal State
  const [editingSpool, setEditingSpool] = useState<SpoolRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('Voolt3D');
  const [editCustomBrand, setEditCustomBrand] = useState('');
  const [editMaterial, setEditMaterial] = useState<MaterialType>('PLA');
  const [editColorName, setEditColorName] = useState('');
  const [editColorHex, setEditColorHex] = useState('#1D63FF');
  const [editInitialWeight, setEditInitialWeight] = useState('1000');
  const [editRemainingWeight, setEditRemainingWeight] = useState('1000');
  const [editPricePaid, setEditPricePaid] = useState('115');
  const [editMinAlert, setEditMinAlert] = useState('200');

  // Delete Confirmation Modal State
  const [spoolToDelete, setSpoolToDelete] = useState<SpoolRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  const lowStockSpools = useMemo(
    () => spools.filter((s) => s.remainingWeightGrams <= s.minAlertGrams),
    [spools]
  );

  const totalGramsAvailable = useMemo(
    () => spools.reduce((acc, s) => acc + s.remainingWeightGrams, 0),
    [spools]
  );

  const totalInventoryValue = useMemo(
    () =>
      spools.reduce((acc, s) => {
        const ratio =
          s.initialWeightGrams > 0
            ? s.remainingWeightGrams / s.initialWeightGrams
            : 0;
        return acc + s.pricePaid * ratio;
      }, 0),
    [spools]
  );

  // Handler when user changes quantity of kg/spools of the same filament
  const handleSelectQuantityKg = (qty: number) => {
    const safeQty = Math.max(1, Math.min(50, qty));
    setSpoolQuantityKg(safeQty);
    const totalGrams = safeQty * 1000;
    setSpoolInitialWeight(String(totalGrams));
    setSpoolRemainingWeight(String(totalGrams));
    const parsedUnit = parseFloat(unitPricePerKg);
    if (!Number.isNaN(parsedUnit) && parsedUnit > 0) {
      setSpoolPricePaid(String(Math.round(parsedUnit * safeQty * 100) / 100));
    }
  };

  const handleCreateSpool = (e: React.FormEvent) => {
    e.preventDefault();
    const initW = parseFloat(spoolInitialWeight);
    const remW = parseFloat(spoolRemainingWeight);
    const price = parseFloat(spoolPricePaid);
    const minAlert = parseFloat(spoolMinAlert);

    const resolvedBrand =
      spoolBrand === '__custom__'
        ? customBrand.trim() || 'Genérico'
        : spoolBrand.trim() || 'Genérico';

    if (!spoolName.trim()) {
      setSpoolError('Informe o nome ou identificação da bobina/resina.');
      return;
    }
    if (
      Number.isNaN(initW) ||
      initW <= 0 ||
      Number.isNaN(price) ||
      price <= 0
    ) {
      setSpoolError('Informe peso inicial e valor pago válidos.');
      return;
    }

    setSpoolError(null);
    onAddSpool({
      name: spoolName.trim(),
      brand: resolvedBrand,
      materialType: spoolMaterial,
      colorName: spoolColorName.trim() || 'Padrão',
      colorHex: spoolColorHex || '#1D63FF',
      initialWeightGrams: initW,
      remainingWeightGrams: Number.isNaN(remW)
        ? initW
        : Math.min(initW, Math.max(0, remW)),
      pricePaid: price,
      minAlertGrams: Number.isNaN(minAlert) ? 200 : Math.max(0, minAlert),
    });
    showToast(
      `Filamento "${spoolName.trim()}" (${(initW / 1000).toFixed(1)}kg · ${resolvedBrand}) adicionado ao estoque!`
    );
    setSpoolName('');
    setSpoolQuantityKg(1);
    setSpoolInitialWeight('1000');
    setSpoolRemainingWeight('1000');
    setSpoolPricePaid(unitPricePerKg || '115');
  };

  // Add +1kg (+1000g) of the same filament to an existing active spool card
  const handleAddOneKgToExistingSpool = (spool: SpoolRecord) => {
    const unitPricePerGram =
      spool.initialWeightGrams > 0
        ? spool.pricePaid / spool.initialWeightGrams
        : 0.115;
    const addedPrice = Math.round(unitPricePerGram * 1000 * 100) / 100;
    const nextRemaining = spool.remainingWeightGrams + 1000;
    const nextInitial = Math.max(
      spool.initialWeightGrams + 1000,
      nextRemaining
    );

    if (onUpdateSpool) {
      onUpdateSpool({
        ...spool,
        initialWeightGrams: nextInitial,
        remainingWeightGrams: nextRemaining,
        pricePaid: Math.round((spool.pricePaid + addedPrice) * 100) / 100,
      });
    } else {
      onUpdateSpoolWeight(spool.id, nextRemaining);
    }
    showToast(
      `+1 kg (1000g) somado ao filamento "${spool.name}"! Total disponível: ${nextRemaining}g`
    );
  };

  const handleOpenEditModal = (spool: SpoolRecord) => {
    setEditingSpool(spool);
    setEditName(spool.name);
    const isKnownBrand = (FAMOUS_FILAMENT_BRANDS as readonly string[]).includes(
      spool.brand
    );
    if (isKnownBrand) {
      setEditBrand(spool.brand);
      setEditCustomBrand('');
    } else {
      setEditBrand('__custom__');
      setEditCustomBrand(spool.brand);
    }
    setEditMaterial(spool.materialType);
    setEditColorName(spool.colorName);
    setEditColorHex(spool.colorHex);
    setEditInitialWeight(String(spool.initialWeightGrams));
    setEditRemainingWeight(String(spool.remainingWeightGrams));
    setEditPricePaid(String(spool.pricePaid));
    setEditMinAlert(String(spool.minAlertGrams));
  };

  const handleSaveEditSpool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpool) return;
    const initW = Math.max(100, parseFloat(editInitialWeight) || 1000);
    const remW = Math.max(0, Math.min(initW, parseFloat(editRemainingWeight) || 0));
    const price = Math.max(1, parseFloat(editPricePaid) || editingSpool.pricePaid);
    const minAlert = Math.max(0, parseFloat(editMinAlert) || 200);
    const resolvedBrand =
      editBrand === '__custom__'
        ? editCustomBrand.trim() || 'Genérico'
        : editBrand;

    const updated: SpoolRecord = {
      ...editingSpool,
      name: editName.trim() || editingSpool.name,
      brand: resolvedBrand,
      materialType: editMaterial,
      colorName: editColorName.trim() || editingSpool.colorName,
      colorHex: editColorHex || editingSpool.colorHex,
      initialWeightGrams: initW,
      remainingWeightGrams: remW,
      pricePaid: price,
      minAlertGrams: minAlert,
    };

    if (onUpdateSpool) {
      onUpdateSpool(updated);
    } else {
      onUpdateSpoolWeight(updated.id, updated.remainingWeightGrams);
    }
    setEditingSpool(null);
    showToast(`Bobina "${updated.name}" atualizada com sucesso!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Controle de Carretéis & Resinas em Estoque
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gerencie suas bobinas ativas, cadastre múltiplos quilos do mesmo filamento e receba alertas de reposição
          </p>
        </div>

        {toast && (
          <div
            role="status"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            {toast}
          </div>
        )}
      </div>

      {/* Subtab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('spools')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === 'spools'
              ? 'bg-[#1D63FF] text-white shadow-md'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>🧵 Bobinas & Resinas</span>
          <span className="rounded-full bg-black/10 dark:bg-white/20 px-2 py-0.5 text-[10px]">
            {spools.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('extraSupplies')}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${
            activeTab === 'extraSupplies'
              ? 'bg-[#1D63FF] text-white shadow-md'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>🔩 Insumos Extras (Hardware/Embalagens)</span>
          <span className="rounded-full bg-black/10 dark:bg-white/20 px-2 py-0.5 text-[10px]">
            {extraSupplies.length}
          </span>
        </button>
      </div>

      {activeTab === 'extraSupplies' ? (
        <ExtraSuppliesManager
          supplies={extraSupplies}
          onAddSupply={(sup) => onAddExtraSupply?.(sup)}
          onUpdateSupply={(sup) => onUpdateExtraSupply?.(sup)}
          onUpdateStock={(id, stock) => onUpdateExtraSupplyStock?.(id, stock)}
          onDeleteSupply={(id) => onDeleteExtraSupply?.(id)}
        />
      ) : (
        <>
          {/* Top Inventory KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-5 text-white shadow-lg">
          <div className="text-xs font-semibold text-slate-300 dark:text-blue-100">
            Material Total Disponível
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums">
            {(totalGramsAvailable / 1000).toFixed(2)} kg ({totalGramsAvailable}g)
          </div>
          <div className="mt-1 text-xs text-slate-300 dark:text-blue-100">
            Distribuído em {spools.length} registros de filamentos/resinas
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Valor Estimado em Estoque
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            {formatCurrencyBRL(totalInventoryValue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Proporcional ao peso restante atual
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Alertas de Reposição
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-amber-500">
            {lowStockSpools.length}{' '}
            <span className="text-sm font-semibold">
              {lowStockSpools.length === 1
                ? 'material acabando'
                : 'materiais acabando'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Abaixo do limite mínimo de gramas
          </div>
        </div>
      </div>

      {lowStockSpools.length > 0 && (
        <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                Alerta de Filamento / Resina Acabando ({lowStockSpools.length})
              </h3>
              <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lowStockSpools.map((s) => (
                  <li key={s.id} className="tabular-nums">
                    • {s.name} ({s.brand}) — Restam apenas{' '}
                    <strong>{s.remainingWeightGrams}g</strong> (alerta configurado em{' '}
                    {s.minAlertGrams}g)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Split: Left = Add Spool Form, Right = Active Spools Grid */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleCreateSpool}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 xl:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Nova Bobina / Resina
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adicione 1 kg ou múltiplos quilos do mesmo filamento ao estoque
              </p>
            </div>
            <Disc className="h-5 w-5 text-[#1D63FF]" />
          </div>

          {spoolError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-500"
            >
              {spoolError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="spool-name"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Identificação do Material
              </label>
              <input
                id="spool-name"
                type="text"
                value={spoolName}
                onChange={(e) => setSpoolName(e.target.value)}
                placeholder="Ex: PLA High Speed Azul Cobalto"
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            {/* Marca / Fabricante Dropdown (semelhante ao Polímero com famosas e Genérico) */}
            <div>
              <label
                htmlFor="spool-brand"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Marca / Fabricante
              </label>
              <select
                id="spool-brand"
                data-testid="spool-brand-select"
                value={spoolBrand}
                onChange={(e) => setSpoolBrand(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              >
                {FAMOUS_FILAMENT_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
                <option value="__custom__">Outra Marca (Digitar)...</option>
              </select>
              {spoolBrand === '__custom__' && (
                <input
                  type="text"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Digite o nome da marca..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              )}
            </div>

            <div>
              <label
                htmlFor="spool-material"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Polímero / Resina
              </label>
              <select
                id="spool-material"
                value={spoolMaterial}
                onChange={(e) =>
                  setSpoolMaterial(e.target.value as MaterialType)
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              >
                <option value="PLA">PLA / PLA+</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS</option>
                <option value="ASA">ASA</option>
                <option value="TPU">TPU Flexível</option>
                <option value="Resina_Standard">Resina Standard UV</option>
                <option value="Resina_ABS_Like">Resina ABS-Like 8K</option>
              </select>
            </div>

            {/* Selector for having > 1kg of the same filament */}
            <div className="sm:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="spool-qty-kg"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  <Layers className="h-3.5 w-3.5 text-[#1D63FF]" />
                  Quantidade do Mesmo Filamento (Bobinas / Kg)
                </label>
                <span className="text-[11px] font-mono font-bold text-[#1D63FF] dark:text-blue-400">
                  Total: {(parseFloat(spoolInitialWeight || '0') / 1000).toFixed(2)} kg ({spoolInitialWeight}g)
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 10].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    data-testid={`spool-qty-${qty}kg`}
                    onClick={() => handleSelectQuantityKg(qty)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      spoolQuantityKg === qty
                        ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                        : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-[#1D63FF]'
                    }`}
                  >
                    {qty} {qty === 1 ? 'Bobina (1kg)' : `Bobinas (${qty}kg)`}
                  </button>
                ))}

                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-slate-500">Qtd:</span>
                  <input
                    id="spool-qty-kg"
                    type="number"
                    min={1}
                    max={50}
                    value={spoolQuantityKg}
                    onChange={(e) =>
                      handleSelectQuantityKg(parseInt(e.target.value, 10) || 1)
                    }
                    className="w-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2 py-1 text-center font-mono text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="spool-weight"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Peso Inicial Total (g)
              </label>
              <input
                id="spool-weight"
                type="number"
                min={100}
                step={50}
                value={spoolInitialWeight}
                onChange={(e) => {
                  setSpoolInitialWeight(e.target.value);
                  setSpoolRemainingWeight(e.target.value);
                }}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="spool-price"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Valor Pago Total (R$)
              </label>
              <input
                id="spool-price"
                type="number"
                min={1}
                step={5}
                value={spoolPricePaid}
                onChange={(e) => {
                  setSpoolPricePaid(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!Number.isNaN(val) && spoolQuantityKg > 0) {
                    setUnitPricePerKg(
                      String(Math.round((val / spoolQuantityKg) * 100) / 100)
                    );
                  }
                }}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="spool-color-name"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cor & Amostra
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Cor hexadecimal da bobina"
                  value={spoolColorHex}
                  onChange={(e) => setSpoolColorHex(e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
                <input
                  id="spool-color-name"
                  type="text"
                  value={spoolColorName}
                  onChange={(e) => setSpoolColorName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="spool-min-alert"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Alerta Mínimo (g)
              </label>
              <input
                id="spool-min-alert"
                type="number"
                min={0}
                step={25}
                value={spoolMinAlert}
                onChange={(e) => setSpoolMinAlert(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1D63FF] px-5 py-3 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Bobina ao Estoque
          </button>
        </form>

        {/* Active Spools List */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 xl:col-span-7">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Carretéis & Resinas Ativas ({spools.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Desconte gramas consumidas, adicione +1kg quando tiver mais bobinas do mesmo filamento ou edite os dados
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {spools.map((spool) => {
              const pct =
                spool.initialWeightGrams > 0
                  ? Math.round(
                      (spool.remainingWeightGrams / spool.initialWeightGrams) *
                        100
                    )
                  : 0;
              const isLow = spool.remainingWeightGrams <= spool.minAlertGrams;
              const approxKilos = (spool.initialWeightGrams / 1000).toFixed(1);

              return (
                <div
                  key={spool.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                    isLow
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#0D0F14]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: spool.colorHex }}
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {spool.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{spool.brand}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{spool.materialType.replace('_', ' ')}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="tabular-nums">
                              Pago {formatCurrencyBRL(spool.pricePaid)}
                            </span>
                            {spool.initialWeightGrams > 1000 && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="font-bold text-[#1D63FF] dark:text-blue-400">
                                  {approxKilos}kg
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(spool)}
                          aria-label={`Editar bobina ${spool.name}`}
                          title="Editar bobina"
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-[#1D63FF] transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpoolToDelete(spool)}
                          aria-label={`Remover bobina ${spool.name}`}
                          title="Excluir bobina"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs tabular-nums">
                        <span
                          className={
                            isLow
                              ? 'font-bold text-amber-500'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }
                        >
                          {spool.remainingWeightGrams}g /{' '}
                          {spool.initialWeightGrams}g ({pct}%)
                        </span>
                        {isLow && (
                          <span className="font-bold text-amber-500">
                            Crítico!
                          </span>
                        )}
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                          }}
                          className={`h-full rounded-full transition-all duration-200 ${
                            isLow ? 'bg-amber-500' : 'bg-hatch-blue'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[11px] text-slate-400">Estoque:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSpoolWeight(
                            spool.id,
                            Math.max(0, spool.remainingWeightGrams - 50)
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2 py-1 text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Minus className="h-3 w-3" /> 50g
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSpoolWeight(
                            spool.id,
                            Math.max(0, spool.remainingWeightGrams - 100)
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2 py-1 text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Minus className="h-3 w-3" /> 100g
                      </button>
                      <button
                        type="button"
                        title="Adicionar +1kg (mais uma bobina deste mesmo filamento)"
                        onClick={() => handleAddOneKgToExistingSpool(spool)}
                        className="inline-flex items-center gap-0.5 rounded-lg border border-blue-500/30 bg-[#1D63FF]/10 px-2 py-1 text-[11px] font-extrabold tabular-nums text-[#1D63FF] dark:text-blue-400 hover:bg-[#1D63FF] hover:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3 w-3" /> 1kg
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSpoolWeight(
                            spool.id,
                            spool.initialWeightGrams
                          )
                        }
                        className="rounded-lg bg-slate-200/80 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#1D63FF] hover:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        Repor
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: EDITAR BOBINA / FILAMENTO */}
      {editingSpool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-spool-modal-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3
                  id="edit-spool-modal-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white"
                >
                  Editar Filamento / Resina
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Altere marca, quantidade em gramas ou valor pago
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSpool(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSpool} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Identificação do Material
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Marca / Fabricante
                  </label>
                  <select
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    {FAMOUS_FILAMENT_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__custom__">Outra Marca...</option>
                  </select>
                  {editBrand === '__custom__' && (
                    <input
                      type="text"
                      value={editCustomBrand}
                      onChange={(e) => setEditCustomBrand(e.target.value)}
                      placeholder="Marca..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Polímero / Resina
                  </label>
                  <select
                    value={editMaterial}
                    onChange={(e) =>
                      setEditMaterial(e.target.value as MaterialType)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    <option value="PLA">PLA / PLA+</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="ASA">ASA</option>
                    <option value="TPU">TPU Flexível</option>
                    <option value="Resina_Standard">Resina Standard UV</option>
                    <option value="Resina_ABS_Like">Resina ABS-Like 8K</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Peso Restante Atual (g)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={editRemainingWeight}
                    onChange={(e) => setEditRemainingWeight(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Capacidade / Peso Inicial (g)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={editInitialWeight}
                    onChange={(e) => setEditInitialWeight(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Valor Pago Total (R$)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={editPricePaid}
                    onChange={(e) => setEditPricePaid(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Alerta Mínimo (g)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={editMinAlert}
                    onChange={(e) => setEditMinAlert(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSpool(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL FOR SPOOL */}
      <ConfirmDeleteModal
        isOpen={Boolean(spoolToDelete)}
        title="Excluir Bobina / Filamento"
        description="Tem certeza que deseja remover este filamento/resina do seu controle de estoque?"
        itemLabel={
          spoolToDelete
            ? `${spoolToDelete.name} (${spoolToDelete.brand} · ${spoolToDelete.remainingWeightGrams}g restantes)`
            : undefined
        }
        onCancel={() => setSpoolToDelete(null)}
        onConfirm={() => {
          if (spoolToDelete) {
            onDeleteSpool(spoolToDelete.id);
            showToast(`Filamento "${spoolToDelete.name}" excluído do estoque.`);
            setSpoolToDelete(null);
          }
        }}
      />
        </>
      )}
    </div>
  );
};
