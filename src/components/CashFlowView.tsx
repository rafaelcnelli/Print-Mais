import React, { useMemo, useState } from 'react';
import {
  TransactionCategory,
  TransactionRecord,
  TransactionType,
} from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';

import {
  isDateWithinTimeRange,
  TimeRangeFilterValue,
  TimeRangeSelector,
} from './TimeRangeSelector';

interface CashFlowViewProps {
  transactions: TransactionRecord[];
  onAddTransaction: (
    tx: Omit<TransactionRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => void;
  onUpdateTransaction?: (updatedTx: TransactionRecord) => void;
  onDeleteTransaction: (txId: string) => void;
  onNavigateToCalculator?: () => void;
}

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  venda_direta: 'Venda Direta',
  encomenda_lote: 'Encomenda de Lote',
  prototipagem: 'Prototipagem Sob Demanda',
  filamento_resina: 'Filamentos & Resinas',
  pecas_reposicao: 'Peças Sobressalentes (Bicos/PTFE/Displays)',
  energia: 'Conta de Energia Rateada',
  manutencao: 'Manutenção de Máquina',
  outros: 'Outros Lançamentos',
};

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onNavigateToCalculator,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilterValue>({
    period: 'all',
  });
  const [txType, setTxType] = useState<TransactionType>('income');
  const [txTitle, setTxTitle] = useState('');
  const [txCategory, setTxCategory] =
    useState<TransactionCategory>('venda_direta');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [txNotes, setTxNotes] = useState('');
  const [txError, setTxError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Edit Transaction Modal State
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<TransactionType>('income');
  const [editCategory, setEditCategory] =
    useState<TransactionCategory>('venda_direta');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [txToDelete, setTxToDelete] = useState<TransactionRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3400);
  };

  // Transactions filtered by the time period (Mês, 3 Meses, 6 Meses, 1 Ano, Personalizado, Tudo)
  const timeScopedTransactions = useMemo(() => {
    return transactions.filter((t) =>
      isDateWithinTimeRange(t.dateIso || t.createdAtIso, timeFilter)
    );
  }, [transactions, timeFilter]);

  const financialTotals = useMemo(() => {
    const totalIn = timeScopedTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalOut = timeScopedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }, [timeScopedTransactions]);

  const filteredTransactions = useMemo(() => {
    return timeScopedTransactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (
        searchQuery.trim() &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !CATEGORY_LABELS[t.category]
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [timeScopedTransactions, filterType, searchQuery]);

  const handleTxTypeSwitch = (nextType: TransactionType) => {
    setTxType(nextType);
    setTxCategory(nextType === 'income' ? 'venda_direta' : 'filamento_resina');
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(txAmount);
    if (!txTitle.trim()) {
      setTxError('Informe uma descrição para o lançamento financeiro.');
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setTxError('Informe um valor válido maior que R$ 0,00.');
      return;
    }
    setTxError(null);
    onAddTransaction({
      title: txTitle.trim(),
      type: txType,
      category: txCategory,
      amount: numericAmount,
      dateIso: txDate || new Date().toISOString().slice(0, 10),
      notes: txNotes.trim(),
    });
    showToast(`Movimentação "${txTitle.trim()}" registrada no caixa!`);
    setTxTitle('');
    setTxAmount('');
    setTxNotes('');
  };

  const handleOpenEditModal = (tx: TransactionRecord) => {
    setEditingTx(tx);
    setEditTitle(tx.title);
    setEditType(tx.type);
    setEditCategory(tx.category);
    setEditAmount(String(tx.amount));
    setEditDate(tx.dateIso || new Date().toISOString().slice(0, 10));
    setEditClientName(tx.clientName || '');
    setEditNotes(tx.notes || '');
    setEditError(null);
  };

  const handleSaveEditedTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const numericAmount = parseFloat(editAmount);
    if (!editTitle.trim()) {
      setEditError('Informe a descrição do lançamento.');
      return;
    }
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setEditError('Informe um valor válido maior que R$ 0,00.');
      return;
    }
    setEditError(null);

    const updated: TransactionRecord = {
      ...editingTx,
      title: editTitle.trim(),
      type: editType,
      category: editCategory,
      amount: numericAmount,
      dateIso: editDate || editingTx.dateIso,
      clientName: editClientName.trim() || undefined,
      notes: editNotes.trim(),
    };

    if (onUpdateTransaction) {
      onUpdateTransaction(updated);
    }
    setEditingTx(null);
    showToast(`Movimentação "${updated.title}" atualizada com sucesso!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Gestão de Fluxo de Caixa
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vendas realizadas de produtos entram automaticamente aqui junto com suas receitas e despesas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {toast && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {toast}
            </div>
          )}

          {onNavigateToCalculator && (
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="inline-flex items-center gap-2 rounded-full bg-[#1D63FF] px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Criar Produto / Registrar Venda na Calculadora
            </button>
          )}
        </div>
      </div>

      {/* Time Range Selector for Cash Flow (Mês, 3 Meses, 6 Meses, 1 Ano, Personalizado, Tudo) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-[#14171F] p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <TimeRangeSelector
          value={timeFilter}
          onChange={setTimeFilter}
        />
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
            {timeScopedTransactions.length}
          </span>{' '}
          {timeScopedTransactions.length === 1 ? 'lançamento no período' : 'lançamentos no período'}
        </div>
      </div>

      {/* Top KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-5 text-white shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-300 dark:text-blue-100">
            <span>Saldo Líquido em Caixa</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950">
              <Wallet className="h-3.5 w-3.5" />
            </span>
          </div>
          <div
            data-testid="cashflow-net-balance"
            className="mt-2 text-2xl font-extrabold tabular-nums text-white"
          >
            {formatCurrencyBRL(financialTotals.balance)}
          </div>
          <div className="mt-1 text-xs text-slate-300 dark:text-blue-100">
            Resultado operacional líquido da oficina
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Entradas Acumuladas</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBRL(financialTotals.totalIn)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Vendas diretas, lotes e prototipagem
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Saídas Operacionais</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <ArrowDownRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-rose-500">
            {formatCurrencyBRL(financialTotals.totalOut)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Filamentos, bicos, PTFE, energia e manutenção
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Left = Registration Form, Right = Cash Flow Ledger */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleCreateTransaction}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 xl:col-span-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Novo Lançamento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registre receitas ou despesas da oficina
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
              <button
                type="button"
                onClick={() => handleTxTypeSwitch('income')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  txType === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                + Entrada
              </button>
              <button
                type="button"
                onClick={() => handleTxTypeSwitch('expense')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  txType === 'expense'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                - Saída
              </button>
            </div>
          </div>

          {txError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-500"
            >
              {txError}
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label
                htmlFor="tx-title"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Descrição do Lançamento
              </label>
              <input
                id="tx-title"
                type="text"
                value={txTitle}
                onChange={(e) => setTxTitle(e.target.value)}
                placeholder={
                  txType === 'income'
                    ? 'Ex: Venda Lote 20 Suportes Headset'
                    : 'Ex: Compra 4 Bobinas PETG Voolt3D'
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="tx-category"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Categoria
              </label>
              <select
                id="tx-category"
                value={txCategory}
                onChange={(e) =>
                  setTxCategory(e.target.value as TransactionCategory)
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              >
                {txType === 'income' ? (
                  <>
                    <option value="venda_direta">
                      Venda Direta (E-commerce / Balcão)
                    </option>
                    <option value="encomenda_lote">
                      Encomenda de Lote B2B
                    </option>
                    <option value="prototipagem">
                      Prototipagem Sob Demanda
                    </option>
                    <option value="outros">Outras Receitas</option>
                  </>
                ) : (
                  <>
                    <option value="filamento_resina">
                      Filamentos & Resinas
                    </option>
                    <option value="pecas_reposicao">
                      Peças Sobressalentes (Bicos, PTFE, PEI)
                    </option>
                    <option value="energia">Conta de Energia Rateada</option>
                    <option value="manutencao">Manutenção de Máquina</option>
                    <option value="outros">Outras Despesas</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Valor (R$)
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="150.00"
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="tx-date"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Data
                </label>
                <input
                  id="tx-date"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-notes"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Observação Opcional
              </label>
              <input
                id="tx-notes"
                type="text"
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                placeholder="Ex: PIX integral, NF, fornecedor"
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1D63FF] px-5 py-3 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Registrar Movimentação no Caixa
            </button>
          </div>
        </form>

        {/* Cash Flow Ledger Table */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Extrato do Fluxo de Caixa ({filteredTransactions.length})
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  aria-label="Buscar transação"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar extrato..."
                  className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
                {(['all', 'income', 'expense'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterType(mode)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      filterType === mode
                        ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {mode === 'all'
                      ? 'Todos'
                      : mode === 'income'
                      ? 'Entradas'
                      : 'Saídas'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
              Nenhuma movimentação encontrada para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-3 font-semibold">Descrição</th>
                    <th className="pb-3 px-3 font-semibold">Categoria · Data</th>
                    <th className="pb-3 px-3 text-right font-semibold">Valor</th>
                    <th className="pb-3 pl-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      data-testid={`cashflow-row-${tx.id}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 pr-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {tx.title}
                          </span>
                          {tx.saleId && (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              VENDA REALIZADA
                            </span>
                          )}
                        </div>
                        {(tx.clientName || tx.paymentMethod || tx.salesChannel) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            {tx.clientName && (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                <User className="h-3 w-3 text-[#1D63FF]" />
                                {tx.clientName}
                              </span>
                            )}
                            {tx.paymentMethod && (
                              <span className="inline-flex items-center gap-1">
                                <CreditCard className="h-3 w-3 text-emerald-500" />
                                {tx.paymentMethod}
                              </span>
                            )}
                            {tx.salesChannel && (
                              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
                                {tx.salesChannel}
                              </span>
                            )}
                          </div>
                        )}
                        {tx.notes && (
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                        <div>{CATEGORY_LABELS[tx.category]}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
                          <span>{tx.dateIso}</span>
                          {tx.saleTime && (
                            <span className="inline-flex items-center gap-0.5 text-[#1D63FF] dark:text-blue-400 font-bold">
                              <Clock className="h-3 w-3" />
                              {tx.saleTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-3.5 px-3 text-right font-mono font-bold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-500'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrencyBRL(tx.amount)}
                      </td>
                      <td className="py-3.5 pl-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            data-testid={`btn-edit-tx-${tx.id}`}
                            onClick={() => handleOpenEditModal(tx)}
                            aria-label={`Editar movimentação ${tx.title}`}
                            title="Editar lançamento"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-[#1D63FF] transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-delete-tx-${tx.id}`}
                            onClick={() => setTxToDelete(tx)}
                            aria-label={`Excluir transação ${tx.title}`}
                            title="Excluir lançamento"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDITAR MOVIMENTAÇÃO / EXTRATO DO CAIXA */}
      {editingTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-tx-modal-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3
                  id="edit-tx-modal-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white"
                >
                  Editar Movimentação / Extrato
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atualize a descrição, categoria, valor ou data e salve no fluxo de caixa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                aria-label="Fechar modal de edição"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTransaction} className="mt-4 space-y-3.5">
              {editError && (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-500"
                >
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tipo de Movimentação
                </span>
                <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('income');
                      if (
                        editCategory === 'filamento_resina' ||
                        editCategory === 'pecas_reposicao' ||
                        editCategory === 'energia' ||
                        editCategory === 'manutencao'
                      ) {
                        setEditCategory('venda_direta');
                      }
                    }}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                      editType === 'income'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('expense');
                      if (
                        editCategory === 'venda_direta' ||
                        editCategory === 'encomenda_lote' ||
                        editCategory === 'prototipagem'
                      ) {
                        setEditCategory('filamento_resina');
                      }
                    }}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                      editType === 'expense'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    - Saída
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Descrição / Título
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(e.target.value as TransactionCategory)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    <option value="venda_direta">Venda Direta</option>
                    <option value="encomenda_lote">Encomenda de Lote</option>
                    <option value="prototipagem">Prototipagem Sob Demanda</option>
                    <option value="filamento_resina">Filamentos & Resinas</option>
                    <option value="pecas_reposicao">Peças Sobressalentes</option>
                    <option value="energia">Conta de Energia Rateada</option>
                    <option value="manutencao">Manutenção de Máquina</option>
                    <option value="outros">Outros Lançamentos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Cliente / Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    placeholder="Ex: TechNova Automação"
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Observações
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-edit-tx"
                  className="rounded-full bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL FOR TRANSACTION */}
      <ConfirmDeleteModal
        isOpen={Boolean(txToDelete)}
        title="Excluir Lançamento do Caixa"
        description="Tem certeza que deseja excluir esta movimentação do extrato financeiro? O saldo será recalculado."
        itemLabel={
          txToDelete
            ? `${txToDelete.title} (${txToDelete.type === 'income' ? '+' : '-'}${formatCurrencyBRL(txToDelete.amount)})`
            : undefined
        }
        onCancel={() => setTxToDelete(null)}
        onConfirm={() => {
          if (txToDelete) {
            onDeleteTransaction(txToDelete.id);
            showToast(`Movimentação "${txToDelete.title}" removida do extrato.`);
            setTxToDelete(null);
          }
        }}
      />
    </div>
  );
};
