import React, { useMemo, useState } from 'react';
import {
  PaymentMethod,
  ProductCategoryRecord,
  ProductRecord,
  QuoteRecord,
  QuoteStatus,
  SaleItemRecord,
  SalesChannel,
  SpoolRecord,
} from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import { createSvgProductPreviewDataUrl } from '../utils/imageHelpers';
import {
  buildQuoteWhatsAppMessage,
  getQuoteItemsList,
  QuotePdfModal,
} from './QuotePdfModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Disc,
  Edit3,
  FileText,
  FolderKanban,
  MessageSquare,
  Minus,
  Package,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';

import {
  isDateWithinTimeRange,
  TimeRangeFilterValue,
  TimeRangeSelector,
} from './TimeRangeSelector';

export interface FilamentDeductionItem {
  spoolId: string;
  gramsUsed: number;
  productName: string;
}

export interface CloseOrderDetails {
  paymentMethod: PaymentMethod;
  salesChannel: SalesChannel;
  saleDate: string;
  saleTime: string;
  notes: string;
  filamentDeductions?: FilamentDeductionItem[];
}

interface CloseFilamentAllocationRow {
  itemKey: string;
  productName: string;
  quantity: number;
  defaultGrams: number;
  spoolId: string;
  gramsUsed: string;
}

interface OrdersViewProps {
  quotes: QuoteRecord[];
  products: ProductRecord[];
  spools?: SpoolRecord[];
  categories?: ProductCategoryRecord[];
  onCreateQuote: (
    quoteInput: Omit<QuoteRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => QuoteRecord | Promise<QuoteRecord>;
  onUpdateQuote?: (updatedQuote: QuoteRecord) => void | Promise<void>;
  onApproveQuote: (quoteId: string) => void;
  onConvertQuoteToOrder: (
    quote: QuoteRecord,
    orderDetails?: CloseOrderDetails
  ) => void;
  onDeleteQuote: (quoteId: string) => void;
  onNavigateToCalculator: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToCashflow: () => void;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNowHm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  quotes,
  products,
  spools = [],
  categories = [],
  onCreateQuote,
  onUpdateQuote,
  onApproveQuote,
  onConvertQuoteToOrder,
  onDeleteQuote,
  onNavigateToCalculator,
  onNavigateToProducts,
  onNavigateToCashflow,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all');
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilterValue>({
    period: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<{
    quote: QuoteRecord;
    mode: 'pdf' | 'whatsapp';
  } | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isBuilderExpanded, setIsBuilderExpanded] = useState<boolean>(true);

  // Modal state for closing sale ("Fechar Venda -> Virar Pedido")
  const [quoteToClose, setQuoteToClose] = useState<QuoteRecord | null>(null);
  const [closePaymentMethod, setClosePaymentMethod] =
    useState<PaymentMethod>('PIX');
  const [closeChannel, setCloseChannel] = useState<SalesChannel>('WhatsApp');
  const [closeDate, setCloseDate] = useState<string>(getTodayIso);
  const [closeTime, setCloseTime] = useState<string>(getNowHm);
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closeFilamentAllocations, setCloseFilamentAllocations] = useState<
    CloseFilamentAllocationRow[]
  >([]);

  // Modal state for editing an existing Quote or Order
  const [quoteToEdit, setQuoteToEdit] = useState<QuoteRecord | null>(null);
  const [editClientName, setEditClientName] = useState<string>('');
  const [editClientContact, setEditClientContact] = useState<string>('');
  const [editProjectName, setEditProjectName] = useState<string>('');
  const [editStatus, setEditStatus] = useState<QuoteStatus>('draft');
  const [editItems, setEditItems] = useState<SaleItemRecord[]>([]);
  const [editDiscountStr, setEditDiscountStr] = useState<string>('0');
  const [editShippingStr, setEditShippingStr] = useState<string>('0');
  const [editDeliveryDays, setEditDeliveryDays] = useState<string>('');
  const [editPaymentTerms, setEditPaymentTerms] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editProductToAddId, setEditProductToAddId] = useState<string>('');

  // Modal state for confirming Quote / Order deletion
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteRecord | null>(null);

  // Quote Builder Search, Category Filter & Cart State
  const [builderProductSearch, setBuilderProductSearch] = useState<string>('');
  const [builderCategoryFilter, setBuilderCategoryFilter] =
    useState<string>('Todas');

  const [quoteItems, setQuoteItems] = useState<SaleItemRecord[]>(() => {
    if (products.length > 0) {
      const first = products[0];
      return [
        {
          productId: first.id,
          productName: first.name,
          sku: first.sku,
          quantity: 5,
          unitCost: first.unitCost,
          unitPrice: first.unitPrice,
          weightGrams: first.weightGrams,
          imageUrl: first.imageUrl,
        },
      ];
    }
    return [];
  });

  const [clientName, setClientName] = useState<string>('');
  const [clientContact, setClientContact] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [shippingStr, setShippingStr] = useState<string>('0');
  const [validDaysStr, setValidDaysStr] = useState<string>('7');
  const [deliveryDays, setDeliveryDays] = useState<string>('4 dias úteis');
  const [paymentTerms, setPaymentTerms] = useState<string>(
    'PIX com 5% de desconto, Cartão em até 3x ou 50% sinal + 50% na entrega'
  );
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [builderError, setBuilderError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Available category names for Quote Builder filter
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Todas', ...Array.from(set)];
  }, [categories, products]);

  // Filtered products for the bounded Quote Builder display
  const filteredCatalogProducts = useMemo(() => {
    const q = builderProductSearch.trim().toLowerCase();
    return products.filter((prod) => {
      if (
        builderCategoryFilter !== 'Todas' &&
        prod.category !== builderCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        prod.category.toLowerCase().includes(q) ||
        (prod.description || '').toLowerCase().includes(q)
      );
    });
  }, [products, builderProductSearch, builderCategoryFilter]);

  // Add or mark a product into the Quote Cart ("Carrinho")
  const handleAddProductToQuote = (
    productOverride: ProductRecord,
    qtyOverride: number = 1
  ) => {
    const prod = productOverride;
    if (!prod) return;
    const qtyToAdd = Math.max(1, qtyOverride);

    setBuilderError(null);
    const existingIndex = quoteItems.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      setQuoteItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        )
      );
    } else {
      setQuoteItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qtyToAdd,
          unitCost: prod.unitCost,
          unitPrice: prod.unitPrice,
          weightGrams: prod.weightGrams,
          imageUrl: prod.imageUrl,
        },
      ]);
    }
  };

  const handleUpdateItemQuantity = (productId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setQuoteItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setQuoteItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: nextQty } : i
      )
    );
  };

  const handleUpdateItemPrice = (productId: string, nextPrice: number) => {
    setQuoteItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, unitPrice: Math.max(0, nextPrice) }
          : i
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setQuoteItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Live totals for the Quote being built from products
  const quoteDraftTotals = useMemo(() => {
    const totalUnits = quoteItems.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = quoteItems.reduce(
      (acc, i) => acc + i.unitPrice * i.quantity,
      0
    );
    const totalCost = quoteItems.reduce(
      (acc, i) => acc + i.unitCost * i.quantity,
      0
    );
    const totalWeightGrams = quoteItems.reduce(
      (acc, i) => acc + i.weightGrams * i.quantity,
      0
    );
    const discountAmount = Math.max(0, parseFloat(discountStr) || 0);
    const shippingAmount = Math.max(0, parseFloat(shippingStr) || 0);
    const totalPrice = Math.max(0, subtotal - discountAmount + shippingAmount);
    const netProfit = totalPrice - shippingAmount - totalCost;
    const avgUnitCost = totalUnits > 0 ? totalCost / totalUnits : 0;
    const avgUnitPrice = totalUnits > 0 ? totalPrice / totalUnits : 0;

    return {
      totalUnits,
      subtotal,
      totalCost,
      totalWeightGrams,
      discountAmount,
      shippingAmount,
      totalPrice,
      netProfit,
      avgUnitCost,
      avgUnitPrice,
    };
  }, [quoteItems, discountStr, shippingStr]);

  const handleSaveNewQuote = async (
    e: React.FormEvent,
    openExportModalAfter: 'pdf' | 'whatsapp' | null = null
  ) => {
    e.preventDefault();
    if (quoteItems.length === 0) {
      setBuilderError(
        'Adicione pelo menos 1 produto do seu catálogo ao carrinho do orçamento.'
      );
      return;
    }
    if (!clientName.trim()) {
      setBuilderError('Informe o nome do cliente ou empresa para o orçamento.');
      return;
    }

    setBuilderError(null);

    const generatedTitle =
      customTitle.trim() ||
      quoteItems.map((i) => `${i.quantity}x ${i.productName}`).join(' + ');

    const itemsSummaryText = quoteItems
      .map(
        (i) =>
          `${i.quantity}x ${i.productName} (${i.sku}) @ ${formatCurrencyBRL(
            i.unitPrice
          )}`
      )
      .join(' + ');

    const primaryProduct = products.find(
      (p) => p.id === quoteItems[0].productId
    );

    const createdQuote = await onCreateQuote({
      clientName: clientName.trim(),
      clientContact: clientContact.trim(),
      projectName: generatedTitle.slice(0, 145),
      technology: primaryProduct?.technology || 'FDM',
      presetId: 'catalogo_produtos',
      weightGrams: Math.round(
        quoteDraftTotals.totalWeightGrams /
          Math.max(1, quoteDraftTotals.totalUnits)
      ),
      filamentPricePerKg: primaryProduct?.filamentPricePerKg || 120,
      printTimeHours: primaryProduct?.printTimeHours || 2,
      printTimeMinutes: primaryProduct?.printTimeMinutes || 0,
      printerPowerWatts: 220,
      energyRateKwh: 0.92,
      printerCost: 4500,
      printerLifespanHours: 4000,
      laborHourlyRate: 40,
      laborHours: 0.25,
      batchQuantity: Math.max(1, quoteDraftTotals.totalUnits),
      profitMarginPercent: primaryProduct?.profitMarginPercent || 100,
      failureRiskPercent: 8,
      unitCost: Math.round(quoteDraftTotals.avgUnitCost * 100) / 100,
      unitPrice: Math.round(quoteDraftTotals.avgUnitPrice * 100) / 100,
      totalPrice: Math.round(quoteDraftTotals.totalPrice * 100) / 100,
      netProfit: Math.round(quoteDraftTotals.netProfit * 100) / 100,
      status: 'draft',
      items: quoteItems,
      itemsSummary: itemsSummaryText,
      discountAmount: Math.round(quoteDraftTotals.discountAmount * 100) / 100,
      shippingAmount: Math.round(quoteDraftTotals.shippingAmount * 100) / 100,
      validDays: Math.max(1, parseInt(validDaysStr, 10) || 7),
      deliveryDays: deliveryDays.trim() || '4 dias úteis',
      paymentTerms:
        paymentTerms.trim() || 'PIX, Cartão ou 50% sinal + 50% na entrega',
      notes: quoteNotes.trim(),
    });

    setClientName('');
    setClientContact('');
    setCustomTitle('');
    setDiscountStr('0');
    setShippingStr('0');
    setQuoteNotes('');

    if (openExportModalAfter) {
      setSelectedQuoteForModal({
        quote: createdQuote,
        mode: openExportModalAfter,
      });
    } else {
      showToast(
        `Orçamento criado com ${quoteDraftTotals.totalUnits} un para "${createdQuote.clientName}"!`
      );
    }
  };

  const handleQuickCopyWhatsApp = async (quote: QuoteRecord) => {
    const text = buildQuoteWhatsAppMessage(quote);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback handled gracefully
    }
    setCopiedQuoteId(quote.id);
    showToast(`Texto de WhatsApp do orçamento "${quote.clientName}" copiado!`);
    setTimeout(() => setCopiedQuoteId(null), 2800);
  };

  const handleOpenCloseOrderModal = (quote: QuoteRecord) => {
    setQuoteToClose(quote);
    setCloseDate(getTodayIso());
    setCloseTime(getNowHm());
    setClosePaymentMethod('PIX');
    setCloseChannel('WhatsApp');
    setCloseNotes(quote.notes || '');

    const items = getQuoteItemsList(quote);
    setCloseFilamentAllocations(
      items.map((item, idx) => {
        const defaultTotalGrams = Math.max(
          1,
          Math.round((item.weightGrams || quote.weightGrams || 50) * item.quantity)
        );
        return {
          itemKey: `${item.productId}_${idx}`,
          productName: item.productName,
          quantity: item.quantity,
          defaultGrams: defaultTotalGrams,
          spoolId: '',
          gramsUsed: String(defaultTotalGrams),
        };
      })
    );
  };

  const handleConfirmCloseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteToClose) return;

    const filamentDeductions: FilamentDeductionItem[] = closeFilamentAllocations
      .filter((row) => row.spoolId.trim() !== '')
      .map((row) => ({
        spoolId: row.spoolId,
        gramsUsed: Math.max(0, Math.round(parseFloat(row.gramsUsed) || 0)),
        productName: row.productName,
      }))
      .filter((d) => d.gramsUsed > 0);

    onConvertQuoteToOrder(quoteToClose, {
      paymentMethod: closePaymentMethod,
      salesChannel: closeChannel,
      saleDate: closeDate,
      saleTime: closeTime,
      notes: closeNotes.trim(),
      filamentDeductions:
        filamentDeductions.length > 0 ? filamentDeductions : undefined,
    });

    const deductedTotalGrams = filamentDeductions.reduce(
      (acc, d) => acc + d.gramsUsed,
      0
    );
    showToast(
      deductedTotalGrams > 0
        ? `Venda fechada! Pedido lançado no Caixa e ${deductedTotalGrams}g descontados do estoque de filamentos.`
        : `Venda fechada! Orçamento de "${quoteToClose.clientName}" virou Pedido Realizado e entrou no Fluxo de Caixa.`
    );
    setQuoteToClose(null);
  };

  // Open Edit Modal for any Quote or Order
  const handleOpenEditQuoteModal = (quote: QuoteRecord) => {
    setQuoteToEdit(quote);
    setEditClientName(quote.clientName);
    setEditClientContact(quote.clientContact || '');
    setEditProjectName(quote.projectName);
    setEditStatus(quote.status);
    setEditItems(getQuoteItemsList(quote));
    setEditDiscountStr(String(quote.discountAmount || 0));
    setEditShippingStr(String(quote.shippingAmount || 0));
    setEditDeliveryDays(quote.deliveryDays || '4 dias úteis');
    setEditPaymentTerms(
      quote.paymentTerms || 'PIX, Cartão ou 50% sinal + 50% na entrega'
    );
    setEditNotes(quote.notes || '');
    setEditProductToAddId(products[0]?.id || '');
  };

  const handleSaveEditedQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteToEdit) return;

    const validItems =
      editItems.length > 0 ? editItems : getQuoteItemsList(quoteToEdit);
    const totalUnits = Math.max(
      1,
      validItems.reduce((acc, i) => acc + Math.max(1, i.quantity), 0)
    );
    const subtotal = validItems.reduce(
      (acc, i) => acc + i.unitPrice * i.quantity,
      0
    );
    const totalCost = validItems.reduce(
      (acc, i) => acc + i.unitCost * i.quantity,
      0
    );
    const totalWeight = validItems.reduce(
      (acc, i) => acc + i.weightGrams * i.quantity,
      0
    );
    const discountAmount = Math.max(0, parseFloat(editDiscountStr) || 0);
    const shippingAmount = Math.max(0, parseFloat(editShippingStr) || 0);
    const totalPrice = Math.max(0, subtotal - discountAmount + shippingAmount);
    const netProfit = totalPrice - shippingAmount - totalCost;
    const avgUnitCost = totalCost / totalUnits;
    const avgUnitPrice = totalPrice / totalUnits;

    const itemsSummaryText = validItems
      .map(
        (i) =>
          `${i.quantity}x ${i.productName} (${i.sku}) @ ${formatCurrencyBRL(
            i.unitPrice
          )}`
      )
      .join(' + ');

    const updatedQuote: QuoteRecord = {
      ...quoteToEdit,
      clientName: editClientName.trim() || quoteToEdit.clientName,
      clientContact: editClientContact.trim(),
      projectName:
        editProjectName.trim() ||
        validItems.map((i) => `${i.quantity}x ${i.productName}`).join(' + '),
      status: editStatus,
      batchQuantity: totalUnits,
      weightGrams: Math.max(1, Math.round(totalWeight / totalUnits)),
      unitCost: Math.round(avgUnitCost * 100) / 100,
      unitPrice: Math.round(avgUnitPrice * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      items: validItems,
      itemsSummary: itemsSummaryText,
      discountAmount: Math.round(discountAmount * 100) / 100,
      shippingAmount: Math.round(shippingAmount * 100) / 100,
      deliveryDays: editDeliveryDays.trim() || '4 dias úteis',
      paymentTerms: editPaymentTerms.trim(),
      notes: editNotes.trim(),
    };

    if (onUpdateQuote) {
      await onUpdateQuote(updatedQuote);
    }
    setQuoteToEdit(null);
    showToast(
      `${
        updatedQuote.status === 'completed' ? 'Pedido' : 'Orçamento'
      } de "${updatedQuote.clientName}" atualizado e salvo!`
    );
  };

  const stats = useMemo(() => {
    const totalPipeline = quotes.reduce((acc, q) => acc + q.totalPrice, 0);
    const completedValue = quotes
      .filter((q) => q.status === 'completed')
      .reduce((acc, q) => acc + q.totalPrice, 0);
    const pendingValue = quotes
      .filter((q) => q.status !== 'completed')
      .reduce((acc, q) => acc + q.totalPrice, 0);
    const totalNetProfit = quotes.reduce((acc, q) => acc + q.netProfit, 0);
    return {
      totalPipeline,
      completedValue,
      pendingValue,
      totalNetProfit,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (!isDateWithinTimeRange(q.createdAtIso, timeFilter)) return false;
      if (
        searchQuery.trim() &&
        !q.projectName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !q.clientName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(q.itemsSummary || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [quotes, statusFilter, timeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Orçamentos de Produtos & Pedidos Realizados
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pesquise produtos do catálogo para marcar no carrinho, ajuste quantidades com + ou -, exporte em PDF/WhatsApp e feche vendas como Pedidos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {toast && (
            <div
              role="status"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {toast}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsBuilderExpanded(!isBuilderExpanded)}
            className="inline-flex items-center gap-2 rounded-full bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {isBuilderExpanded
              ? 'Ocultar Montador de Orçamento'
              : 'Novo Orçamento c/ Produtos'}
          </button>
          {onNavigateToProducts && (
            <button
              type="button"
              onClick={onNavigateToProducts}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
            >
              <Package className="h-3.5 w-3.5 text-[#1D63FF]" />
              Gerenciar Catálogo & Fotos ({products.length})
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToCalculator}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
          >
            Calculadora de Custo
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-5 text-white shadow-lg">
          <div className="text-xs font-semibold text-slate-300 dark:text-blue-100">
            Volume Total Orçado
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums">
            {formatCurrencyBRL(stats.totalPipeline)}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-blue-100">
            {quotes.length} orçamentos registrados
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Pedidos Realizados (Vendas Fechadas)
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBRL(stats.completedValue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Convertidos em pedido e lançados no Caixa
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Orçamentos Pendentes / Aprovados
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-[#1D63FF] dark:text-blue-400">
            {formatCurrencyBRL(stats.pendingValue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Aguardando fechamento no WhatsApp
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Lucro Líquido Projetado
          </div>
          <div className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
            +{formatCurrencyBRL(stats.totalNetProfit)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Descontando custos reais dos produtos
          </div>
        </div>
      </div>

      {/* MONTADOR DE ORÇAMENTO A PARTIR DE PRODUTOS */}
      {isBuilderExpanded && (
        <section
          aria-label="Montador de Orçamento a partir de Produtos"
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6 shadow-sm"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0D0F14] dark:bg-[#1D63FF] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Montar Novo Orçamento a partir dos Seus Produtos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pesquise o produto abaixo para filtrar a lista, clique para marcar no carrinho e ajuste a quantidade digitando ou clicando em + e -
                </p>
              </div>
            </div>
          </div>

          {builderError && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500"
            >
              {builderError}
            </div>
          )}

          <form
            onSubmit={(e) => handleSaveNewQuote(e, null)}
            className="space-y-6"
          >
            {/* TOP ROW: 1. Cliente, Prazo & Condições (Left 7 Cols) + Resumo Comercial (Right 5 Cols) */}
            <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
              {/* Left 7 Cols: Customer Registration & Proposal Terms */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-6 xl:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 border-b border-slate-200/70 dark:border-slate-800 pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1D63FF] text-white">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        1. Cadastro do Cliente & Condições do Orçamento
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Informe os dados do comprador, prazo de produção, frete, descontos e termos comerciais
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="quote-client-name"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Cliente / Empresa *
                      </label>
                      <input
                        id="quote-client-name"
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Construtora Horizonte ou João Silva"
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quote-client-contact"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        WhatsApp / E-mail do Cliente
                      </label>
                      <input
                        id="quote-client-contact"
                        type="text"
                        value={clientContact}
                        onChange={(e) => setClientContact(e.target.value)}
                        placeholder="Ex: (11) 99876-5432"
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quote-delivery-days"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Prazo de Produção / Entrega
                      </label>
                      <input
                        id="quote-delivery-days"
                        type="text"
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(e.target.value)}
                        placeholder="Ex: 3 a 5 dias úteis"
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quote-valid-days"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Validade da Proposta (Dias)
                      </label>
                      <input
                        id="quote-valid-days"
                        type="number"
                        min={1}
                        max={90}
                        value={validDaysStr}
                        onChange={(e) => setValidDaysStr(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quote-discount"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Desconto Comercial (R$)
                      </label>
                      <input
                        id="quote-discount"
                        type="number"
                        min={0}
                        step={1}
                        value={discountStr}
                        onChange={(e) => setDiscountStr(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="quote-shipping"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Frete / Envio (R$)
                      </label>
                      <input
                        id="quote-shipping"
                        type="number"
                        min={0}
                        step={1}
                        value={shippingStr}
                        onChange={(e) => setShippingStr(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="quote-payment-terms"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Condições de Pagamento
                      </label>
                      <input
                        id="quote-payment-terms"
                        type="text"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="quote-notes"
                        className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        Observações para o PDF / WhatsApp
                      </label>
                      <input
                        id="quote-notes"
                        type="text"
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Ex: Peças em PETG Preto Carbono c/ nota fiscal inclusa"
                        className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: High-Contrast Quote Summary Card (Blue in Dark Mode, Black in Light Mode) */}
              <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-6 text-white shadow-xl xl:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 dark:text-blue-100">
                      Resumo da Proposta Comercial
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-extrabold text-white">
                      {quoteItems.length}{' '}
                      {quoteItems.length === 1 ? 'produto' : 'produtos'} ·{' '}
                      {quoteDraftTotals.totalUnits} un
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#161A24] dark:bg-[#0D0F14] p-4">
                    <div className="text-xs text-slate-300">
                      Valor Total do Orçamento
                    </div>
                    <div
                      data-testid="quote-builder-total"
                      className="mt-1 text-3xl font-extrabold tabular-nums text-white"
                    >
                      {formatCurrencyBRL(quoteDraftTotals.totalPrice)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Peso total estimado: {quoteDraftTotals.totalWeightGrams}g
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-200 dark:text-blue-100">
                      <span>Subtotal dos Produtos:</span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatCurrencyBRL(quoteDraftTotals.subtotal)}
                      </span>
                    </div>
                    {quoteDraftTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Desconto Concedido:</span>
                        <span className="font-mono font-bold tabular-nums">
                          -{formatCurrencyBRL(quoteDraftTotals.discountAmount)}
                        </span>
                      </div>
                    )}
                    {quoteDraftTotals.shippingAmount > 0 && (
                      <div className="flex justify-between text-slate-200 dark:text-blue-100">
                        <span>Frete / Entrega:</span>
                        <span className="font-mono font-bold tabular-nums">
                          +{formatCurrencyBRL(quoteDraftTotals.shippingAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/15 pt-2 text-slate-200 dark:text-blue-100">
                      <span>Custo Interno de Produção:</span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatCurrencyBRL(quoteDraftTotals.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/15 pt-2 text-sm font-extrabold text-emerald-300 dark:text-white">
                      <span>Lucro Líquido se Fechar:</span>
                      <span className="font-mono tabular-nums">
                        +{formatCurrencyBRL(quoteDraftTotals.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <button
                    type="submit"
                    data-testid="btn-save-product-quote"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-slate-950 hover:bg-slate-100 transition-colors shadow-md"
                  >
                    <FolderKanban className="h-4 w-4 text-[#1D63FF]" />
                    Salvar Orçamento de Produtos
                  </button>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={(e) => handleSaveNewQuote(e, 'whatsapp')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 transition-colors shadow-md"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Salvar & Texto WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSaveNewQuote(e, 'pdf')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/10 dark:bg-[#0D0F14]/50 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-white/20 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Salvar & Gerar PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION: 2. Pesquisar Produto Ocupando Todo o Espaço Horizontal (Full-Width) */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1D63FF] text-white">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      2. Pesquisar Produto para Adicionar ao Carrinho
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ao ir digitando ou filtrando por categoria, a vitrine é refinada em tempo real. Clique em um card para marcar no carrinho.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#1D63FF]/10 px-3 py-1 text-xs font-extrabold text-[#1D63FF] dark:text-blue-400">
                  {filteredCatalogProducts.length} de {products.length} produtos exibidos
                </span>
              </div>

              {/* Full-Width Search Input & Category Pills */}
              <div className="space-y-3">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="quote-product-search"
                    data-testid="quote-product-search"
                    type="text"
                    value={builderProductSearch}
                    onChange={(e) => setBuilderProductSearch(e.target.value)}
                    placeholder="Pesquisar produto por nome, SKU ou categoria (ex: Engrenagem, Articulado, Suporte, Malenia)..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] pl-11 pr-10 py-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-xs placeholder:font-normal focus:border-[#1D63FF] focus:outline-none shadow-xs"
                  />
                  {builderProductSearch && (
                    <button
                      type="button"
                      onClick={() => setBuilderProductSearch('')}
                      aria-label="Limpar pesquisa de produto"
                      className="absolute right-3.5 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills (Full Width) */}
                <div className="flex flex-wrap items-center gap-2">
                  {availableCategories.map((catName) => {
                    const active = builderCategoryFilter === catName;
                    return (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => setBuilderCategoryFilter(catName)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                            : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] text-slate-600 dark:text-slate-300 hover:border-[#1D63FF]'
                        }`}
                      >
                        {catName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOUNDED FULL-WIDTH PRODUCT DISPLAY (Styled after image_f16ba315.png, 1 to 4 columns across screen) */}
              <div
                data-testid="quote-bounded-product-list"
                className="mt-4 max-h-[380px] overflow-y-auto pr-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filteredCatalogProducts.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-[#14171F] p-8 text-center">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nenhum produto encontrado para "{builderProductSearch}"
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Limpe o filtro acima ou cadastre um novo produto na aba Produtos & Categorias.
                    </p>
                  </div>
                ) : (
                  filteredCatalogProducts.map((prod) => {
                    const cartItem = quoteItems.find(
                      (i) => i.productId === prod.id
                    );
                    const isMarkedInCart = Boolean(cartItem);
                    const thumbUrl =
                      prod.imageUrl ||
                      createSvgProductPreviewDataUrl(
                        prod.name,
                        prod.category,
                        '#1D63FF'
                      );

                    return (
                      <div
                        key={prod.id}
                        data-testid={`quote-product-card-${prod.id}`}
                        onClick={() => handleAddProductToQuote(prod, 1)}
                        className={`group cursor-pointer rounded-2xl border p-4 transition-all shadow-xs flex flex-col justify-between ${
                          isMarkedInCart
                            ? 'border-[#1D63FF] bg-blue-50/50 dark:bg-[#1D63FF]/15 ring-2 ring-[#1D63FF]'
                            : 'border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#14171F] hover:border-[#1D63FF]'
                        }`}
                      >
                        <div>
                          {/* Top Row: Photo/Icon + Name/Category + "Lançar / Marcar" Pill */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={thumbUrl}
                                alt={prod.name}
                                className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                                  {prod.name}
                                </div>
                                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  {prod.category} · {prod.sku}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-testid={`btn-select-product-${prod.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProductToQuote(prod, 1);
                              }}
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold transition-colors whitespace-nowrap ${
                                isMarkedInCart
                                  ? 'bg-[#1D63FF] text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-[#0D0F14] text-slate-800 dark:text-slate-200 group-hover:bg-[#1D63FF] group-hover:text-white'
                              }`}
                            >
                              {isMarkedInCart ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  No Carrinho ({cartItem?.quantity})
                                </>
                              ) : (
                                <>
                                  Selecionar
                                  <ArrowRight className="h-3 w-3" />
                                </>
                              )}
                            </button>
                          </div>

                          {/* Hairline Divider */}
                          <div className="my-3 border-t border-slate-100 dark:border-slate-800/80" />
                        </div>

                        {/* Bottom Row: VALOR 1-CLIQUE (left) and ESTOQUE / PESO (right) */}
                        <div className="flex items-end justify-between gap-2 pt-1">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              VALOR 1-CLIQUE
                            </div>
                            <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                              {formatCurrencyBRL(prod.unitPrice)}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              ESTOQUE & PESO
                            </div>
                            <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                              {prod.stockQuantity} un · {prod.weightGrams}g
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CARRINHO DO ORÇAMENTO (Selected Products with + / - and direct quantity input) */}
              <div className="mt-6 border-t border-slate-200/80 dark:border-slate-800 pt-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-[#1D63FF]" />
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                      Carrinho do Orçamento ({quoteItems.length}{' '}
                      {quoteItems.length === 1 ? 'item marcado' : 'itens marcados'})
                    </h5>
                  </div>
                  {quoteItems.length > 0 && (
                    <span className="font-mono text-xs font-extrabold text-[#1D63FF] dark:text-blue-400">
                      Total: {quoteDraftTotals.totalUnits} un
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  {quoteItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                      O carrinho está vazio. Pesquise e clique em um produto na vitrine acima para marcá-lo no orçamento.
                    </div>
                  ) : (
                    quoteItems.map((item) => {
                      const prodRef = products.find(
                        (p) => p.id === item.productId
                      );
                      const itemThumb =
                        item.imageUrl ||
                        prodRef?.imageUrl ||
                        createSvgProductPreviewDataUrl(
                          item.productName,
                          prodRef?.category || '3D',
                          '#1D63FF'
                        );

                      return (
                        <div
                          key={item.productId}
                          data-testid={`cart-item-${item.productId}`}
                          className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-3.5 sm:grid-cols-12 shadow-xs"
                        >
                          {/* Product Photo + Info */}
                          <div className="flex items-center gap-3 sm:col-span-5 min-w-0">
                            <img
                              src={itemThumb}
                              alt={item.productName}
                              className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-slate-900 dark:text-white">
                                {item.productName}
                              </div>
                              <div className="truncate text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {item.sku} · Custo: {formatCurrencyBRL(item.unitCost)} · {item.weightGrams}g
                              </div>
                            </div>
                          </div>

                          {/* Quantity Stepper (- / Direct Input / +) */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold text-slate-400">
                              Quantidade (digite ou + / -)
                            </label>
                            <div className="mt-0.5 inline-flex w-full items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D0F14] p-0.5">
                              <button
                                type="button"
                                data-testid={`btn-cart-minus-${item.productId}`}
                                aria-label={`Diminuir quantidade de ${item.productName}`}
                                onClick={() =>
                                  handleUpdateItemQuantity(
                                    item.productId,
                                    item.quantity - 1
                                  )
                                }
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                data-testid={`input-cart-qty-${item.productId}`}
                                aria-label={`Quantidade de ${item.productName} no orçamento`}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQuantity(
                                    item.productId,
                                    Math.max(
                                      1,
                                      parseInt(e.target.value, 10) || 1
                                    )
                                  )
                                }
                                className="w-full bg-transparent px-1 text-center font-mono text-xs font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                data-testid={`btn-cart-plus-${item.productId}`}
                                aria-label={`Aumentar quantidade de ${item.productName}`}
                                onClick={() =>
                                  handleUpdateItemQuantity(
                                    item.productId,
                                    item.quantity + 1
                                  )
                                }
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Unit Price Input */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-400">
                              Unitário (R$)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              aria-label={`Preço unitário de ${item.productName} no orçamento`}
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateItemPrice(
                                  item.productId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="mt-0.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                            />
                          </div>

                          {/* Subtotal & Remove */}
                          <div className="flex items-center justify-between sm:col-span-2 sm:justify-end gap-2">
                            <div className="text-right font-mono text-xs font-extrabold tabular-nums text-[#1D63FF] dark:text-blue-400">
                              {formatCurrencyBRL(
                                item.unitPrice * item.quantity
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              aria-label={`Remover ${item.productName} do orçamento`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* LISTA DE ORÇAMENTOS E PEDIDOS REALIZADOS */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
            {(
              [
                { id: 'all', label: `Todos (${quotes.length})` },
                {
                  id: 'draft',
                  label: `Orçamentos em Aberto (${
                    quotes.filter((q) => q.status === 'draft').length
                  })`,
                },
                {
                  id: 'approved',
                  label: `Aprovados (${
                    quotes.filter((q) => q.status === 'approved').length
                  })`,
                },
                {
                  id: 'completed',
                  label: `Pedidos Realizados (${
                    quotes.filter((q) => q.status === 'completed').length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              aria-label="Buscar por cliente ou produto no orçamento"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente ou produto..."
              className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
            />
          </div>
        </div>

        {/* Time Filter Bar: Mês, 3 Meses, 6 Meses, 1 Ano, Personalizado */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <TimeRangeSelector
            value={timeFilter}
            onChange={setTimeFilter}
          />
          <div className="text-xs font-semibold text-slate-400">
            Exibindo <span className="font-extrabold text-slate-900 dark:text-white">{filteredQuotes.length}</span> orçamentos
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum orçamento encontrado para este filtro
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Use o Montador de Orçamentos acima selecionando seus produtos e quantidades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredQuotes.map((q) => {
              const items = getQuoteItemsList(q);
              const isCopied = copiedQuoteId === q.id;
              return (
                <div
                  key={q.id}
                  data-testid={`quote-card-${q.id}`}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0D0F14] p-5 transition-all hover:border-[#1D63FF]/50"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                            <User className="h-3 w-3 text-[#1D63FF]" />
                            {q.clientName}
                          </span>
                          {q.clientContact && <span>· {q.clientContact}</span>}
                        </div>
                        <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                          {q.projectName}
                        </h3>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-extrabold whitespace-nowrap ${
                          q.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : q.status === 'approved'
                            ? 'bg-blue-500/15 text-[#1D63FF] dark:text-blue-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {q.status === 'completed'
                          ? 'Pedido Realizado'
                          : q.status === 'approved'
                          ? 'Orçamento Aprovado'
                          : 'Orçamento em Aberto'}
                      </span>
                    </div>

                    {/* Products & Quantities Included in the Quote */}
                    <div className="mt-3 space-y-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#14171F] p-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Produtos & Quantidades no Orçamento ({items.length})
                      </div>
                      {items.map((item, idx) => (
                        <div
                          key={`${item.productId}_${idx}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            <strong className="font-mono font-extrabold text-[#1D63FF] dark:text-blue-400">
                              {item.quantity}x
                            </strong>{' '}
                            {item.productName}{' '}
                            <span className="font-mono text-[10px] text-slate-400">
                              ({item.sku})
                            </span>
                          </span>
                          <span className="font-mono font-bold tabular-nums text-slate-700 dark:text-slate-300">
                            {formatCurrencyBRL(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary Strip */}
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white dark:bg-[#14171F] p-3 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">
                          Volume Total
                        </div>
                        <div className="mt-0.5 font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {q.batchQuantity} un
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          Total do Orçamento
                        </div>
                        <div className="mt-0.5 font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrencyBRL(q.totalPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">
                          Lucro Líquido
                        </div>
                        <div className="mt-0.5 font-mono font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatCurrencyBRL(q.netProfit)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions: PDF, WhatsApp, Virar Pedido */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800/80 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`btn-pdf-${q.id}`}
                        onClick={() =>
                          setSelectedQuoteForModal({ quote: q, mode: 'pdf' })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#1D63FF]" />
                        Exportar PDF
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-whatsapp-${q.id}`}
                        onClick={() => {
                          handleQuickCopyWhatsApp(q);
                          setSelectedQuoteForModal({
                            quote: q,
                            mode: 'whatsapp',
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3.5 w-3.5" />
                            Texto WhatsApp
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {q.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => {
                            onApproveQuote(q.id);
                            showToast(
                              `Orçamento de "${q.clientName}" marcado como Aprovado!`
                            );
                          }}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-bold text-[#1D63FF] dark:text-blue-400 hover:bg-[#1D63FF] hover:text-white transition-colors"
                        >
                          Aprovar
                        </button>
                      )}

                      {q.status !== 'completed' ? (
                        <button
                          type="button"
                          data-testid={`btn-turn-into-order-${q.id}`}
                          onClick={() => handleOpenCloseOrderModal(q)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63FF] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Virar Pedido
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onNavigateToCashflow}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          No Fluxo de Caixa
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid={`btn-edit-quote-${q.id}`}
                        onClick={() => handleOpenEditQuoteModal(q)}
                        aria-label={`Editar ${
                          q.status === 'completed' ? 'pedido' : 'orçamento'
                        } ${q.projectName}`}
                        title={
                          q.status === 'completed'
                            ? 'Editar Pedido'
                            : 'Editar Orçamento'
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-[#1D63FF] transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-delete-quote-${q.id}`}
                        onClick={() => setQuoteToDelete(q)}
                        aria-label={`Excluir orçamento ${q.projectName}`}
                        title="Excluir"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: FECHAR VENDA -> VIRAR PEDIDO REALIZADO (COM OPÇÃO DE INFORMAR FILAMENTOS USADOS DO ESTOQUE) */}
      {quoteToClose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-order-modal-title"
        >
          <div className="my-auto w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <PackageCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3
                    id="close-order-modal-title"
                    className="text-base font-extrabold text-slate-900 dark:text-white"
                  >
                    Fechar Venda — Converter Orçamento em Pedido
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confirme os dados do fechamento para gerar o Pedido e lançar no Fluxo de Caixa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteToClose(null)}
                aria-label="Fechar modal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseOrder} className="mt-4 space-y-4">
              <div className="rounded-2xl bg-[#0D0F14] dark:bg-[#1D63FF] p-4 text-white">
                <div className="text-xs text-slate-300 dark:text-blue-100">
                  Cliente: <strong>{quoteToClose.clientName}</strong>
                </div>
                <div className="mt-0.5 text-sm font-bold">
                  {quoteToClose.projectName}
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-white/15 pt-2">
                  <span className="text-xs text-slate-300 dark:text-blue-100">
                    Valor Fechado do Pedido:
                  </span>
                  <span className="font-mono text-xl font-extrabold tabular-nums">
                    {formatCurrencyBRL(quoteToClose.totalPrice)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="close-order-date"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Dia do Fechamento
                  </label>
                  <input
                    id="close-order-date"
                    type="date"
                    required
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="close-order-time"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Horário do Fechamento
                  </label>
                  <div className="relative mt-1">
                    <Clock className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      id="close-order-time"
                      type="time"
                      required
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-8 pr-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="close-order-payment"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Forma de Pagamento
                  </label>
                  <div className="relative mt-1">
                    <CreditCard className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <select
                      id="close-order-payment"
                      value={closePaymentMethod}
                      onChange={(e) =>
                        setClosePaymentMethod(e.target.value as PaymentMethod)
                      }
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                    >
                      <option value="PIX">PIX Instantâneo</option>
                      <option value="Cartao_Credito">Cartão de Crédito</option>
                      <option value="Cartao_Debito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Boleto">Boleto Faturado</option>
                      <option value="Transferencia">Transferência TED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="close-order-channel"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Canal de Fechamento
                  </label>
                  <select
                    id="close-order-channel"
                    value={closeChannel}
                    onChange={(e) =>
                      setCloseChannel(e.target.value as SalesChannel)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp Comercial</option>
                    <option value="Instagram">Instagram Direct</option>
                    <option value="Mercado_Livre">Mercado Livre</option>
                    <option value="Shopee">Shopee</option>
                    <option value="Loja_Propria">Site / Loja Própria</option>
                    <option value="Balcao">Balcão / Presencial</option>
                  </select>
                </div>
              </div>

              {/* OPTIONAL SECTION: INFORMAR QUAIS FILAMENTOS DO ESTOQUE USOU PARA CADA PRODUTO VENDIDO */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Disc className="h-4 w-4 text-[#1D63FF]" />
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Filamentos Utilizados do Estoque por Produto (Opcional)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Informe opcionalmente qual bobina foi usada em cada produto, veja o gasto previsto e altere se tiver sido diferente
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Opcional
                  </span>
                </div>

                <div className="space-y-2.5">
                  {closeFilamentAllocations.map((alloc, idx) => {
                    const selectedSpool = spools.find(
                      (s) => s.id === alloc.spoolId
                    );
                    const parsedGrams = Math.max(
                      0,
                      Math.round(parseFloat(alloc.gramsUsed) || 0)
                    );
                    const costPerGram =
                      selectedSpool && selectedSpool.initialWeightGrams > 0
                        ? selectedSpool.pricePaid /
                          selectedSpool.initialWeightGrams
                        : 0;
                    const estimatedFilamentCost = costPerGram * parsedGrams;
                    const nextSpoolRemaining = selectedSpool
                      ? Math.max(
                          0,
                          selectedSpool.remainingWeightGrams - parsedGrams
                        )
                      : 0;

                    return (
                      <div
                        key={alloc.itemKey}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            <strong className="font-mono text-[#1D63FF] dark:text-blue-400">
                              {alloc.quantity}x
                            </strong>{' '}
                            {alloc.productName}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            Gasto previsto: <strong>{alloc.defaultGrams}g</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-8">
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              Filamento / Bobina do Estoque (Opcional)
                            </label>
                            <select
                              data-testid={`close-order-spool-select-${idx}`}
                              value={alloc.spoolId}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                setCloseFilamentAllocations((prev) =>
                                  prev.map((r, rIdx) =>
                                    rIdx === idx ? { ...r, spoolId: nextId } : r
                                  )
                                );
                              }}
                              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                            >
                              <option value="">
                                Não descontar do estoque (Opcional)
                              </option>
                              {spools.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name} ({sp.brand} ·{' '}
                                  {sp.materialType.replace('_', ' ')}) — Disp:{' '}
                                  {sp.remainingWeightGrams}g
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              Gasto Real (g)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              data-testid={`close-order-grams-input-${idx}`}
                              value={alloc.gramsUsed}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setCloseFilamentAllocations((prev) =>
                                  prev.map((r, rIdx) =>
                                    rIdx === idx
                                      ? { ...r, gramsUsed: nextVal }
                                      : r
                                  )
                                );
                              }}
                              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                            />
                          </div>
                        </div>

                        {selectedSpool && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono border-t border-slate-200/60 dark:border-slate-800/60">
                            <span className="text-slate-600 dark:text-slate-300">
                              Estoque:{' '}
                              <strong>
                                {selectedSpool.remainingWeightGrams}g
                              </strong>{' '}
                              →{' '}
                              <strong className="text-[#1D63FF] dark:text-blue-400">
                                {nextSpoolRemaining}g
                              </strong>{' '}
                              (-{parsedGrams}g)
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Custo do filamento usado:{' '}
                              {formatCurrencyBRL(estimatedFilamentCost)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="close-order-notes"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Observações do Pedido Realizado
                </label>
                <input
                  id="close-order-notes"
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Sinal pago via PIX, entrega agendada"
                  className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteToClose(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-confirm-close-order"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors shadow-md"
                >
                  <PackageCheck className="h-4 w-4" />
                  Confirmar Pedido & Lançar no Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ORÇAMENTO OU PEDIDO REALIZADO */}
      {quoteToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-quote-modal-title"
        >
          <div className="my-auto w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3
                  id="edit-quote-modal-title"
                  className="text-base font-extrabold text-slate-900 dark:text-white"
                >
                  Editar{' '}
                  {quoteToEdit.status === 'completed'
                    ? 'Pedido Realizado'
                    : 'Orçamento'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Altere cliente, status, produtos, quantidades, descontos ou observações e salve
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteToEdit(null)}
                aria-label="Fechar modal de edição"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuote} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Cliente / Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    WhatsApp / Contato
                  </label>
                  <input
                    type="text"
                    value={editClientContact}
                    onChange={(e) => setEditClientContact(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Título do Orçamento / Pedido
                  </label>
                  <input
                    type="text"
                    required
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as QuoteStatus)
                    }
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    <option value="draft">Orçamento em Aberto</option>
                    <option value="approved">Orçamento Aprovado</option>
                    <option value="completed">Pedido Realizado</option>
                  </select>
                </div>
              </div>

              {/* Edit Products & Quantities */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0D0F14] p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Produtos & Quantidades ({editItems.length})
                  </span>
                  {products.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={editProductToAddId}
                        onChange={(e) => setEditProductToAddId(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            + {p.name} ({formatCurrencyBRL(p.unitPrice)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const prod = products.find(
                            (p) => p.id === editProductToAddId
                          );
                          if (!prod) return;
                          setEditItems((prev) => {
                            const existingIdx = prev.findIndex(
                              (i) => i.productId === prod.id
                            );
                            if (existingIdx >= 0) {
                              return prev.map((it, idx) =>
                                idx === existingIdx
                                  ? { ...it, quantity: it.quantity + 1 }
                                  : it
                              );
                            }
                            return [
                              ...prev,
                              {
                                productId: prod.id,
                                productName: prod.name,
                                sku: prod.sku,
                                quantity: 1,
                                unitCost: prod.unitCost,
                                unitPrice: prod.unitPrice,
                                weightGrams: prod.weightGrams,
                                imageUrl: prod.imageUrl,
                              },
                            ];
                          });
                        }}
                        className="rounded-xl bg-[#1D63FF] px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-600"
                      >
                        Incluir
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {editItems.map((item, idx) => (
                    <div
                      key={`${item.productId}_${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3 py-2 text-xs"
                    >
                      <div className="min-w-[160px] flex-1">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.sku} · {item.weightGrams}g/un
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const nextQ = Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1
                              );
                              setEditItems((prev) =>
                                prev.map((it, iIdx) =>
                                  iIdx === idx ? { ...it, quantity: nextQ } : it
                                )
                              );
                            }}
                            className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2 py-1 text-center font-mono text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">R$ un:</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const nextP = Math.max(
                                0,
                                parseFloat(e.target.value) || 0
                              );
                              setEditItems((prev) =>
                                prev.map((it, iIdx) =>
                                  iIdx === idx
                                    ? { ...it, unitPrice: nextP }
                                    : it
                                )
                              );
                            }}
                            className="w-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2 py-1 text-right font-mono text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </div>

                        {editItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditItems((prev) =>
                                prev.filter((_, iIdx) => iIdx !== idx)
                              )
                            }
                            className="rounded-lg p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editDiscountStr}
                    onChange={(e) => setEditDiscountStr(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Frete / Envio (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editShippingStr}
                    onChange={(e) => setEditShippingStr(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Prazo de Entrega
                  </label>
                  <input
                    type="text"
                    value={editDeliveryDays}
                    onChange={(e) => setEditDeliveryDays(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={editPaymentTerms}
                    onChange={(e) => setEditPaymentTerms(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteToEdit(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-edit-quote"
                  className="rounded-full bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL FOR QUOTE OR ORDER */}
      <ConfirmDeleteModal
        isOpen={Boolean(quoteToDelete)}
        title={
          quoteToDelete?.status === 'completed'
            ? 'Excluir Pedido Realizado'
            : 'Excluir Orçamento'
        }
        description="Tem certeza que deseja excluir este registro? Esta ação removerá o item da sua lista permanentemente."
        itemLabel={
          quoteToDelete
            ? `${quoteToDelete.clientName} — ${quoteToDelete.projectName} (${formatCurrencyBRL(
                quoteToDelete.totalPrice
              )})`
            : undefined
        }
        onCancel={() => setQuoteToDelete(null)}
        onConfirm={() => {
          if (quoteToDelete) {
            onDeleteQuote(quoteToDelete.id);
            showToast(
              `Registro "${quoteToDelete.projectName}" excluído com sucesso.`
            );
            setQuoteToDelete(null);
          }
        }}
      />

      {selectedQuoteForModal && (
        <QuotePdfModal
          isOpen={true}
          onClose={() => setSelectedQuoteForModal(null)}
          quote={selectedQuoteForModal.quote}
          initialMode={selectedQuoteForModal.mode}
        />
      )}
    </div>
  );
};
