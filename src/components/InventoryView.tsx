import React, { useMemo, useState } from 'react';
import { MaterialType, SpoolRecord } from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import {
  AlertTriangle,
  Disc,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';

interface InventoryViewProps {
  spools: SpoolRecord[];
  onAddSpool: (
    spool: Omit<SpoolRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onUpdateSpoolWeight: (spoolId: string, nextWeightGrams: number) => void;
  onDeleteSpool: (spoolId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  spools,
  onAddSpool,
  onUpdateSpoolWeight,
  onDeleteSpool,
}) => {
  const [spoolName, setSpoolName] = useState('');
  const [spoolBrand, setSpoolBrand] = useState('Voolt3D');
  const [spoolMaterial, setSpoolMaterial] = useState<MaterialType>('PLA');
  const [spoolColorName, setSpoolColorName] = useState('Preto Ônix');
  const [spoolColorHex, setSpoolColorHex] = useState('#1D63FF');
  const [spoolInitialWeight, setSpoolInitialWeight] = useState('1000');
  const [spoolRemainingWeight, setSpoolRemainingWeight] = useState('1000');
  const [spoolPricePaid, setSpoolPricePaid] = useState('115');
  const [spoolMinAlert, setSpoolMinAlert] = useState('200');
  const [spoolError, setSpoolError] = useState<string | null>(null);

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

  const handleCreateSpool = (e: React.FormEvent) => {
    e.preventDefault();
    const initW = parseFloat(spoolInitialWeight);
    const remW = parseFloat(spoolRemainingWeight);
    const price = parseFloat(spoolPricePaid);
    const minAlert = parseFloat(spoolMinAlert);

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
      brand: spoolBrand.trim() || 'Genérica',
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
    setSpoolName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Controle de Carretéis & Resinas em Estoque
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gerencie suas bobinas ativas, acompanhe o peso restante em gramas e receba alertas de reposição
        </p>
      </div>

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
            Distribuído em {spools.length} bobinas/frascos
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
                Adicione novos insumos ao seu controle de estoque
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

            <div>
              <label
                htmlFor="spool-brand"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Marca / Fabricante
              </label>
              <input
                id="spool-brand"
                type="text"
                value={spoolBrand}
                onChange={(e) => setSpoolBrand(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
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

            <div>
              <label
                htmlFor="spool-weight"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Peso Inicial (g)
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
                Valor Pago (R$)
              </label>
              <input
                id="spool-price"
                type="number"
                min={1}
                step={5}
                value={spoolPricePaid}
                onChange={(e) => setSpoolPricePaid(e.target.value)}
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
            Desconte gramas consumidas após cada impressão para manter o estoque preciso
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
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteSpool(spool.id)}
                        aria-label={`Remover bobina ${spool.name}`}
                        className="rounded-lg p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
                    <span className="text-[11px] text-slate-400">Consumo:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSpoolWeight(
                            spool.id,
                            Math.max(0, spool.remainingWeightGrams - 50)
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1 text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Minus className="h-3 w-3" /> 100g
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSpoolWeight(
                            spool.id,
                            spool.initialWeightGrams
                          )
                        }
                        className="rounded-lg bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#1D63FF] hover:text-white transition-colors whitespace-nowrap shrink-0"
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
    </div>
  );
};
