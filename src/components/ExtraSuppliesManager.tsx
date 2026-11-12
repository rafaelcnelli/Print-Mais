import React, { useMemo, useState } from 'react';
import { ExtraSupplyCategory, ExtraSupplyRecord } from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Edit3,
  Minus,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

const CATEGORIES: { label: ExtraSupplyCategory; icon: string }[] = [
  { label: 'Ferragens', icon: '🔩' },
  { label: 'Fixadores', icon: '🧲' },
  { label: 'Embalagem', icon: '📦' },
  { label: 'Acabamento', icon: '✨' },
  { label: 'Eletrônicos', icon: '⚡' },
  { label: 'Outros', icon: '🏷️' },
];

interface ExtraSuppliesManagerProps {
  supplies: ExtraSupplyRecord[];
  onAddSupply: (
    supply: Omit<ExtraSupplyRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onUpdateSupply: (supply: ExtraSupplyRecord) => void;
  onUpdateStock: (supplyId: string, nextStock: number) => void;
  onDeleteSupply: (supplyId: string) => void;
}

export const ExtraSuppliesManager: React.FC<ExtraSuppliesManagerProps> = ({
  supplies,
  onAddSupply,
  onUpdateSupply,
  onUpdateStock,
  onDeleteSupply,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // New Supply Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExtraSupplyCategory>('Ferragens');
  const [precoPacote, setPrecoPacote] = useState('');
  const [qtdPacote, setQtdPacote] = useState('100');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [manualCustoUnitario, setManualCustoUnitario] = useState(false);
  const [estoqueAtual, setEstoqueAtual] = useState('50');
  const [estoqueMinimo, setEstoqueMinimo] = useState('15');
  const [unit, setUnit] = useState('un');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Supply Modal State
  const [editingSupply, setEditingSupply] = useState<ExtraSupplyRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ExtraSupplyCategory>('Ferragens');
  const [editPrecoPacote, setEditPrecoPacote] = useState('');
  const [editQtdPacote, setEditQtdPacote] = useState('100');
  const [editCustoUnitario, setEditCustoUnitario] = useState('');
  const [editEstoqueAtual, setEditEstoqueAtual] = useState('');
  const [editEstoqueMinimo, setEditEstoqueMinimo] = useState('');
  const [editUnit, setEditUnit] = useState('un');
  const [editNotes, setEditNotes] = useState('');

  // Delete Modal
  const [supplyToDelete, setSupplyToDelete] = useState<ExtraSupplyRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  // Auto-calculate unit cost from package when typing in new modal
  const handlePrecoPacoteChange = (val: string) => {
    setPrecoPacote(val);
    if (!manualCustoUnitario) {
      const p = parseFloat(val) || 0;
      const q = Math.max(1, parseInt(qtdPacote, 10) || 1);
      if (p > 0) {
        setCustoUnitario((p / q).toFixed(3));
      }
    }
  };

  const handleQtdPacoteChange = (val: string) => {
    setQtdPacote(val);
    if (!manualCustoUnitario) {
      const p = parseFloat(precoPacote) || 0;
      const q = Math.max(1, parseInt(val, 10) || 1);
      if (p > 0) {
        setCustoUnitario((p / q).toFixed(3));
      }
    }
  };

  // KPIs
  const totalUnits = useMemo(
    () => supplies.reduce((acc, s) => acc + (s.estoqueAtual || 0), 0),
    [supplies]
  );

  const totalValue = useMemo(
    () => supplies.reduce((acc, s) => acc + (s.estoqueAtual || 0) * (s.custoUnitario || 0), 0),
    [supplies]
  );

  const lowStockCount = useMemo(
    () => supplies.filter((s) => s.estoqueAtual <= s.estoqueMinimo).length,
    [supplies]
  );

  const filteredSupplies = useMemo(() => {
    return supplies.filter((s) => {
      const supplyCat = s.categoria || s.category || '';
      const supplyName = s.nome || s.name || '';
      const supplyNotes = s.observacoes || s.notes || '';
      const matchesCategory = selectedCategory === 'all' || supplyCat === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        supplyName.toLowerCase().includes(q) ||
        supplyNotes.toLowerCase().includes(q) ||
        supplyCat.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [supplies, selectedCategory, searchQuery]);

  const handleCreateSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Informe o nome do insumo.');
      return;
    }
    const unitCost = Math.max(0.001, parseFloat(custoUnitario) || 0.01);
    const stockCurrent = Math.max(0, parseInt(estoqueAtual, 10) || 0);
    const stockMin = Math.max(0, parseInt(estoqueMinimo, 10) || 0);
    const packagePrice = precoPacote ? Math.max(0, parseFloat(precoPacote) || 0) : undefined;
    const packageQty = qtdPacote ? Math.max(1, parseInt(qtdPacote, 10) || 1) : undefined;

    onAddSupply({
      nome: name.trim(),
      name: name.trim(),
      categoria: category,
      category,
      precoCompraPacote: packagePrice,
      quantidadeNoPacote: packageQty,
      custoUnitario: unitCost,
      estoqueAtual: stockCurrent,
      estoqueMinimo: stockMin,
      unidadeMedida: unit.trim() || 'un',
      unit: unit.trim() || 'un',
      observacoes: notes.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setName('');
    setPrecoPacote('');
    setQtdPacote('100');
    setCustoUnitario('');
    setManualCustoUnitario(false);
    setEstoqueAtual('50');
    setEstoqueMinimo('15');
    setNotes('');
    setFormError(null);
    setIsNewModalOpen(false);
    showToast(`Insumo "${name.trim()}" cadastrado com sucesso!`);
  };

  const handleOpenEdit = (supply: ExtraSupplyRecord) => {
    setEditingSupply(supply);
    setEditName(supply.nome || supply.name || '');
    setEditCategory((supply.categoria || supply.category || 'Ferragens') as ExtraSupplyCategory);
    setEditPrecoPacote(supply.precoCompraPacote ? String(supply.precoCompraPacote) : '');
    setEditQtdPacote(supply.quantidadeNoPacote ? String(supply.quantidadeNoPacote) : '100');
    setEditCustoUnitario(String(supply.custoUnitario));
    setEditEstoqueAtual(String(supply.estoqueAtual));
    setEditEstoqueMinimo(String(supply.estoqueMinimo));
    setEditUnit(supply.unidadeMedida || supply.unit || 'un');
    setEditNotes(supply.observacoes || supply.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupply) return;
    if (!editName.trim()) return;

    const unitCost = Math.max(0.001, parseFloat(editCustoUnitario) || editingSupply.custoUnitario);
    const stockCurrent = Math.max(0, parseInt(editEstoqueAtual, 10) || 0);
    const stockMin = Math.max(0, parseInt(editEstoqueMinimo, 10) || 0);
    const packagePrice = editPrecoPacote ? Math.max(0, parseFloat(editPrecoPacote) || 0) : undefined;
    const packageQty = editQtdPacote ? Math.max(1, parseInt(editQtdPacote, 10) || 1) : undefined;

    const updated: ExtraSupplyRecord = {
      ...editingSupply,
      nome: editName.trim(),
      name: editName.trim(),
      categoria: editCategory,
      category: editCategory,
      precoCompraPacote: packagePrice,
      quantidadeNoPacote: packageQty,
      custoUnitario: unitCost,
      estoqueAtual: stockCurrent,
      estoqueMinimo: stockMin,
      unidadeMedida: editUnit.trim() || 'un',
      unit: editUnit.trim() || 'un',
      observacoes: editNotes.trim() || undefined,
      notes: editNotes.trim() || undefined,
    };

    onUpdateSupply(updated);
    setEditingSupply(null);
    showToast(`Insumo "${updated.nome || updated.name}" atualizado!`);
  };

  const handleQuickAdjust = (supply: ExtraSupplyRecord, delta: number) => {
    const nextStock = Math.max(0, supply.estoqueAtual + delta);
    onUpdateStock(supply.id, nextStock);
    showToast(
      `${delta > 0 ? '+' : ''}${delta} un em "${supply.name}". Saldo: ${nextStock} un`
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white dark:bg-blue-600 px-4 py-3 text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            🔩 Insumos Extras & Componentes
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre ferragens, parafusos, ímãs, insertos metálicos e embalagens para embutir na precificação
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          + Novo Insumo Extra
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-4">
          <div className="text-[11px] font-semibold text-slate-400">Itens Cadastrados</div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {supplies.length}
          </div>
          <div className="text-[10px] text-slate-400">Tipos de componentes</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-4">
          <div className="text-[11px] font-semibold text-slate-400">Total em Unidades</div>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {totalUnits.toLocaleString('pt-BR')}
          </div>
          <div className="text-[10px] text-slate-400">Disponíveis na oficina</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-4">
          <div className="text-[11px] font-semibold text-slate-400">Capital Imobilizado</div>
          <div className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBRL(totalValue)}
          </div>
          <div className="text-[10px] text-slate-400">Valor em estoque</div>
        </div>

        <div
          className={`rounded-2xl border p-4 transition-colors ${
            lowStockCount > 0
              ? 'border-amber-400/60 bg-amber-500/10 dark:bg-amber-500/10'
              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <span>Alerta de Reposição</span>
            {lowStockCount > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
          </div>
          <div className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">
            {lowStockCount}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
            {lowStockCount === 1 ? '1 item com estoque baixo' : `${lowStockCount} itens com estoque baixo`}
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#1D63FF] text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            Todos ({supplies.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = supplies.filter((s) => s.category === c.label).length;
            return (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(c.label)}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  selectedCategory === c.label
                    ? 'bg-[#1D63FF] text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D63FF]"
          />
        </div>
      </div>

      {/* Grid of Supplies */}
      {filteredSupplies.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/40 dark:bg-[#14171F]/40">
          <Boxes className="mx-auto h-10 w-10 text-slate-400" />
          <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum insumo extra encontrado
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'Tente remover o filtro de categoria ou a busca digitada.'
              : 'Cadastre ferragens, parafusos ou embalagens para vincular nos seus custos de produção.'}
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="mt-4 rounded-xl bg-[#1D63FF] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-blue-600 transition-colors"
          >
            + Cadastrar Primeiro Insumo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSupplies.map((supply) => {
            const isLowStock = supply.estoqueAtual <= supply.estoqueMinimo;
            const itemTotalValue = supply.estoqueAtual * supply.custoUnitario;

            return (
              <div
                key={supply.id}
                className={`relative rounded-3xl border bg-white dark:bg-[#14171F] p-5 shadow-sm transition-all hover:shadow-md ${
                  isLowStock
                    ? 'border-amber-400/80 dark:border-amber-500/70'
                    : 'border-slate-200/80 dark:border-slate-800/90'
                }`}
              >
                {/* Top badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                      {supply.category}
                    </span>
                    {isLowStock && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Estoque Baixo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(supply)}
                      title="Editar Insumo"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSupplyToDelete(supply)}
                      title="Excluir Insumo"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Name & Notes */}
                <h4 className="mt-2.5 text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2">
                  {supply.name}
                </h4>
                {supply.notes && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {supply.notes}
                  </p>
                )}

                {/* Unit Cost info */}
                <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-[#0D0F14] p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Custo Unitário:</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyBRL(supply.custoUnitario)}
                      <span className="text-[10px] font-normal text-slate-400"> /{supply.unit || 'un'}</span>
                    </span>
                  </div>

                  {supply.precoCompraPacote && supply.quantidadeNoPacote && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Pacote de compra:</span>
                      <span>
                        {formatCurrencyBRL(supply.precoCompraPacote)} ({supply.quantidadeNoPacote} {supply.unit || 'un'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Controls */}
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      Saldo em Estoque (Mín: {supply.estoqueMinimo} {supply.unit || 'un'})
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {supply.estoqueAtual} <span className="text-xs font-bold text-slate-500">{supply.unit || 'un'}</span>
                    </div>
                  </div>

                  {/* Quick +/- buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickAdjust(supply, -1)}
                      disabled={supply.estoqueAtual <= 0}
                      title="Diminuir 1 un"
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(supply, 1)}
                      title="Adicionar 1 un"
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(supply, 10)}
                      title="Adicionar 10 un"
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      +10
                    </button>
                  </div>
                </div>

                {/* Total stock value footer */}
                <div className="mt-2 text-right text-[10px] text-slate-400">
                  Total estocado: <strong className="text-slate-700 dark:text-slate-300">{formatCurrencyBRL(itemTotalValue)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#14171F] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔩</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Novo Insumo Extra
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupply} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              {/* Name and Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome do Insumo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Argola de Chaveiro 25mm, Ímã 5x2mm, Caixa Envio P"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D63FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExtraSupplyCategory)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D63FF]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unidade de Medida
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="un, kit, par, metro"
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Package purchase helper -> auto unit cost */}
              <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200">
                    Calculador por Pacote de Compra (Opcional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualCustoUnitario(!manualCustoUnitario)}
                    className="text-[10px] font-bold text-[#1D63FF] hover:underline"
                  >
                    {manualCustoUnitario ? '← Usar cálculo automático' : 'Digitar custo unitário direto →'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Preço do Pacote (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 25.00"
                      value={precoPacote}
                      onChange={(e) => handlePrecoPacoteChange(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14] px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Qtd. no Pacote ({unit})
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 100"
                      value={qtdPacote}
                      onChange={(e) => handleQtdPacoteChange(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14] px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-blue-200/50 dark:border-blue-900/40">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Custo Unitário Final (R$/{unit}) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      placeholder="0.25"
                      value={custoUnitario}
                      onChange={(e) => {
                        setManualCustoUnitario(true);
                        setCustoUnitario(e.target.value);
                      }}
                      className="w-24 rounded-xl border border-[#1D63FF] bg-white dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Stock and Min Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estoque Atual ({unit}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={estoqueAtual}
                    onChange={(e) => setEstoqueAtual(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Observações / Fornecedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Comprado no Mercado Livre loja X, aço inox, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
                >
                  Cadastrar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSupply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#14171F] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Editar Insumo Extra
              </h3>
              <button
                onClick={() => setEditingSupply(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nome do Insumo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExtraSupplyCategory)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custo Unitário (R$/{editUnit}) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={editCustoUnitario}
                    onChange={(e) => setEditCustoUnitario(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estoque Atual ({editUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editEstoqueAtual}
                    onChange={(e) => setEditEstoqueAtual(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editEstoqueMinimo}
                    onChange={(e) => setEditEstoqueMinimo(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupply(null)}
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

      {/* DELETE CONFIRMATION */}
      <ConfirmDeleteModal
        isOpen={Boolean(supplyToDelete)}
        title="Excluir Insumo Extra"
        description="Tem certeza que deseja remover este insumo extra do cadastro de estoque?"
        itemLabel={
          supplyToDelete
            ? `${supplyToDelete.name} (${supplyToDelete.estoqueAtual} ${supplyToDelete.unit || 'un'} em estoque)`
            : undefined
        }
        onCancel={() => setSupplyToDelete(null)}
        onConfirm={() => {
          if (supplyToDelete) {
            onDeleteSupply(supplyToDelete.id);
            showToast(`Insumo "${supplyToDelete.name}" removido.`);
            setSupplyToDelete(null);
          }
        }}
      />
    </div>
  );
};
