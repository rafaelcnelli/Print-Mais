import React, { useMemo, useRef, useState } from 'react';
import {
  CalculatorParams,
  CostBreakdownResult,
  MarketplacePriceDetail,
  MarketplacePriceSummary,
  PaymentMethod,
  ProductCategoryRecord,
  ProductRecord,
  SaleItemRecord,
  SaleRecord,
  SalesChannel,
} from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import { process3DFile } from '../firebase';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  ArrowUpRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileCode,
  Package,
  PackagePlus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react';

interface ProductSalesWorkspaceProps {
  currentCalcParams: CalculatorParams;
  currentBreakdown: CostBreakdownResult;
  products: ProductRecord[];
  categories?: ProductCategoryRecord[];
  selectedCategory?: string;
  sales: SaleRecord[];
  onCreateProduct: (
    productInput: Omit<ProductRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => ProductRecord | Promise<ProductRecord>;
  onDeleteProduct: (productId: string) => void;
  onLoadProductIntoCalculator: (product: ProductRecord) => void;
  onRegisterSale: (
    saleInput: Omit<SaleRecord, 'id' | 'ownerId' | 'transactionId' | 'createdAtIso'>
  ) => void | Promise<void>;
  onDeleteSale: (sale: SaleRecord) => void;
  onNavigateToCashflow: () => void;
  isCreateProductModalOpen: boolean;
  setIsCreateProductModalOpen: (open: boolean) => void;
  isRegisterSaleModalOpen: boolean;
  setIsRegisterSaleModalOpen: (open: boolean) => void;
  marketplaceSummaries?: MarketplacePriceDetail[];
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX Instantâneo',
  Cartao_Credito: 'Cartão de Crédito',
  Cartao_Debito: 'Cartão de Débito',
  Dinheiro: 'Dinheiro / Espécie',
  Boleto: 'Boleto Faturado',
  Transferencia: 'Transferência TED',
};

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  WhatsApp: 'WhatsApp Comercial',
  Instagram: 'Instagram Direct',
  Mercado_Livre: 'Mercado Livre',
  Shopee: 'Shopee',
  Loja_Propria: 'Site / Loja Própria',
  Balcao: 'Balcão / Presencial',
};

const DEFAULT_PRODUCT_CATEGORIES = [
  'Peça Técnica',
  'Miniatura / Action Figure',
  'Chaveiro / Brinde',
  'Decoração & Setup',
  'Lote Industrial',
  'Prototipagem',
];

function getNowDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNowTimeHm(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const ProductSalesWorkspace: React.FC<ProductSalesWorkspaceProps> = ({
  currentCalcParams,
  currentBreakdown,
  products,
  categories = [],
  selectedCategory,
  sales,
  onCreateProduct,
  onDeleteProduct,
  onLoadProductIntoCalculator,
  onRegisterSale,
  onDeleteSale,
  onNavigateToCashflow,
  isCreateProductModalOpen,
  setIsCreateProductModalOpen,
  isRegisterSaleModalOpen,
  setIsRegisterSaleModalOpen,
  marketplaceSummaries = [],
}) => {
  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => c.name);
    }
    return DEFAULT_PRODUCT_CATEGORIES;
  }, [categories]);

  const [activeTab, setActiveTab] = useState<'catalog' | 'new_sale' | 'sales_history'>('catalog');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductRecord | null>(
    null
  );
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);

  // Create Product Form State (synced from Calculator when opened)
  const [prodName, setProdName] = useState(currentCalcParams.projectName);
  const [prodSku, setProdSku] = useState(`PRD-0${products.length + 1}`);
  const [prodCategory, setProdCategory] = useState(selectedCategory || availableCategories[0] || 'Peça Técnica');
  const [prodCustomPrice, setProdCustomPrice] = useState<string>(
    currentBreakdown.unitPrice.toFixed(2)
  );
  const [prodStock, setProdStock] = useState<string>('10');
  const [prodDescription, setProdDescription] = useState<string>(
    `Peça ${currentCalcParams.technology} (${currentCalcParams.weightGrams}g)`
  );

  // 3D Printing Project File Upload State
  const [arquivo3dUrl, setArquivo3dUrl] = useState<string>('');
  const [arquivo3dNome, setArquivo3dNome] = useState<string>('');
  const [arquivo3dTamanho, setArquivo3dTamanho] = useState<string>('');
  const [arquivo3dFormato, setArquivo3dFormato] = useState<string>('');
  const [isProcessing3DFile, setIsProcessing3DFile] = useState(false);
  const fileInput3DRef = useRef<HTMLInputElement>(null);

  const handle3DFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing3DFile(true);
      const res = await process3DFile(file);
      setArquivo3dUrl(res.arquivo3dUrl);
      setArquivo3dNome(res.arquivo3dNome);
      setArquivo3dTamanho(res.arquivo3dTamanho);
      setArquivo3dFormato(res.arquivo3dFormato);
      notify(`Arquivo 3D "${res.arquivo3dNome}" (${res.arquivo3dTamanho}) anexado!`);
    } catch {
      notify('Não foi possível processar o arquivo 3D.');
    } finally {
      setIsProcessing3DFile(false);
      e.target.value = '';
    }
  };

  // Sync product modal fields when modal opens
  React.useEffect(() => {
    if (isCreateProductModalOpen) {
      setProdName(currentCalcParams.projectName || 'Novo Produto 3D');
      setProdSku(`PRD-${String(products.length + 1).padStart(3, '0')}`);
      setProdCategory(selectedCategory || availableCategories[0] || 'Peça Técnica');
      setProdCustomPrice(currentBreakdown.unitPrice.toFixed(2));
      setProdDescription(
        `Impressão ${currentCalcParams.technology} · ${currentCalcParams.weightGrams}g · ${currentCalcParams.printTimeHours}h${currentCalcParams.printTimeMinutes}m`
      );
      setArquivo3dUrl('');
      setArquivo3dNome('');
      setArquivo3dTamanho('');
      setArquivo3dFormato('');
    }
  }, [
    isCreateProductModalOpen,
    currentCalcParams,
    currentBreakdown,
    products.length,
    selectedCategory,
    availableCategories,
  ]);

  // Register Sale Form State
  const [saleClientName, setSaleClientName] = useState<string>(
    currentCalcParams.clientName || ''
  );
  const [saleClientContact, setSaleClientContact] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(getNowDateIso);
  const [saleTime, setSaleTime] = useState<string>(getNowTimeHm);
  const [salePaymentMethod, setSalePaymentMethod] = useState<PaymentMethod>('PIX');
  const [saleChannel, setSaleChannel] = useState<SalesChannel>('WhatsApp');
  const [saleDiscount, setSaleDiscount] = useState<string>('0');
  const [saleShipping, setSaleShipping] = useState<string>('0');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [saleStatus, setSaleStatus] = useState<'concluida' | 'pendente'>('concluida');
  const [saleError, setSaleError] = useState<string | null>(null);

  // Cart items for the sale
  const [cartItems, setCartItems] = useState<SaleItemRecord[]>(() => {
    if (products.length > 0) {
      const first = products[0];
      return [
        {
          productId: first.id,
          productName: first.name,
          sku: first.sku,
          quantity: 1,
          unitCost: first.unitCost,
          unitPrice: first.unitPrice,
          weightGrams: first.weightGrams,
        },
      ];
    }
    return [];
  });

  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>(
    products[0]?.id || ''
  );

  // Keep selectedProductToAdd valid when products change
  React.useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedProductToAdd)) {
      setSelectedProductToAdd(products[0].id);
    }
  }, [products, selectedProductToAdd]);

  // When Register Sale tab is requested via external trigger, switch to new_sale tab
  React.useEffect(() => {
    if (isRegisterSaleModalOpen) {
      setActiveTab('new_sale');
      setSaleDate(getNowDateIso());
      setSaleTime(getNowTimeHm());
      if (cartItems.length === 0 && products.length > 0) {
        const first = products[0];
        setCartItems([
          {
            productId: first.id,
            productName: first.name,
            sku: first.sku,
            quantity: 1,
            unitCost: first.unitCost,
            unitPrice: first.unitPrice,
            weightGrams: first.weightGrams,
          },
        ]);
      }
      setIsRegisterSaleModalOpen(false);
    }
  }, [isRegisterSaleModalOpen, products, cartItems.length, setIsRegisterSaleModalOpen]);

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Handle creating a product from Calculator parameters
  const handleCreateProductSubmit = async (
    e: React.FormEvent,
    openSaleAfter = false
  ) => {
    e.preventDefault();
    const mpPrices: ProductRecord['marketplacePrices'] = {};
    if (marketplaceSummaries && marketplaceSummaries.length > 0) {
      for (const ms of marketplaceSummaries) {
        if (ms.platform === 'shopee') mpPrices.shopee = ms;
        if (ms.platform === 'mercadoLivre') mpPrices.mercadoLivre = ms;
        if (ms.platform === 'amazon') mpPrices.amazon = ms;
      }
    }

    const parsedPrice = parseFloat(prodCustomPrice) || currentBreakdown.unitPrice;
    const parsedStock = parseInt(prodStock, 10) || 0;

    const created = await onCreateProduct({
      name: prodName.trim() || currentCalcParams.projectName || 'Produto 3D',
      sku: prodSku.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      category: prodCategory,
      technology: currentCalcParams.technology,
      weightGrams: currentCalcParams.weightGrams,
      printTimeHours: currentCalcParams.printTimeHours,
      printTimeMinutes: currentCalcParams.printTimeMinutes,
      filamentPricePerKg: currentCalcParams.filamentPricePerKg,
      unitCost: Math.round(currentBreakdown.unitCost * 100) / 100,
      unitPrice: Math.round(parsedPrice * 100) / 100,
      profitMarginPercent: currentCalcParams.profitMarginPercent,
      stockQuantity: parsedStock,
      description: prodDescription.trim(),
      paramsSnapshot: { ...currentCalcParams },
      extraSupplies: currentCalcParams.extraSupplies,
      marketplacePrices: Object.keys(mpPrices).length > 0 ? mpPrices : undefined,
      arquivo3dUrl: arquivo3dUrl || undefined,
      arquivo3dNome: arquivo3dNome || undefined,
      arquivo3dTamanho: arquivo3dTamanho || undefined,
      arquivo3dFormato: arquivo3dFormato || undefined,
    });

    setIsCreateProductModalOpen(false);
    setSelectedProductToAdd(created.id);

    if (openSaleAfter) {
      setCartItems([
        {
          productId: created.id,
          productName: created.name,
          sku: created.sku,
          quantity: Math.max(1, currentCalcParams.batchQuantity || 1),
          unitCost: created.unitCost,
          unitPrice: created.unitPrice,
          weightGrams: created.weightGrams,
        },
      ]);
      setSaleClientName(currentCalcParams.clientName || '');
      setSaleDate(getNowDateIso());
      setSaleTime(getNowTimeHm());
      setActiveTab('new_sale');
      setIsRegisterSaleModalOpen(true);
      notify(`Produto "${created.name}" criado! Preencha os dados da venda abaixo.`);
    } else {
      setActiveTab('catalog');
      notify(`Produto "${created.name}" adicionado ao seu catálogo!`);
    }
  };

  const handleStartSaleWithProduct = (product: ProductRecord) => {
    const existingIdx = cartItems.findIndex((i) => i.productId === product.id);
    if (existingIdx >= 0) {
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitCost: product.unitCost,
          unitPrice: product.unitPrice,
          weightGrams: product.weightGrams,
        },
      ]);
    }
    setSaleDate(getNowDateIso());
    setSaleTime(getNowTimeHm());
    setActiveTab('new_sale');
    setIsRegisterSaleModalOpen(true);
  };

  const handleAddSelectedProductToCart = () => {
    const prod = products.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;
    const existingIdx = cartItems.findIndex((i) => i.productId === prod.id);
    if (existingIdx >= 0) {
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: 1,
          unitCost: prod.unitCost,
          unitPrice: prod.unitPrice,
          weightGrams: prod.weightGrams,
        },
      ]);
    }
  };

  const handleUpdateCartItemQty = (productId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: nextQty } : i))
    );
  };

  const handleUpdateCartItemPrice = (productId: string, nextPrice: number) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, unitPrice: Math.max(0, nextPrice) } : i
      )
    );
  };

  const saleTotals = useMemo(() => {
    const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantity, 0);
    const subtotalAmount = cartItems.reduce(
      (acc, i) => acc + i.unitPrice * i.quantity,
      0
    );
    const totalCost = cartItems.reduce(
      (acc, i) => acc + i.unitCost * i.quantity,
      0
    );
    const totalWeightGrams = cartItems.reduce(
      (acc, i) => acc + i.weightGrams * i.quantity,
      0
    );
    const discountAmount = Math.max(0, parseFloat(saleDiscount) || 0);
    const shippingAmount = Math.max(0, parseFloat(saleShipping) || 0);
    const totalAmount = Math.max(
      0,
      subtotalAmount - discountAmount + shippingAmount
    );
    const netProfit = totalAmount - shippingAmount - totalCost;

    return {
      totalQuantity,
      subtotalAmount,
      discountAmount,
      shippingAmount,
      totalAmount,
      totalCost,
      netProfit,
      totalWeightGrams,
    };
  }, [cartItems, saleDiscount, saleShipping]);

  const handleRegisterSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setSaleError('Adicione pelo menos 1 produto do catálogo à venda.');
      return;
    }
    if (!saleClientName.trim()) {
      setSaleError('Informe o nome do cliente que realizou a compra.');
      return;
    }
    if (!saleDate) {
      setSaleError('Informe o dia da venda.');
      return;
    }
    if (!saleTime) {
      setSaleError('Informe o horário da venda.');
      return;
    }

    setSaleError(null);

    const productNameSummary =
      cartItems.length === 1
        ? `${cartItems[0].quantity}x ${cartItems[0].productName}`
        : `${cartItems[0].quantity}x ${cartItems[0].productName} + ${
            cartItems.length - 1
          } ${cartItems.length - 1 === 1 ? 'item' : 'itens'}`;

    const itemsSummary = cartItems
      .map(
        (i) =>
          `${i.quantity}x ${i.productName} (${i.sku}) @ ${formatCurrencyBRL(
            i.unitPrice
          )}`
      )
      .join(' + ');

    await onRegisterSale({
      clientName: saleClientName.trim(),
      clientContact: saleClientContact.trim(),
      saleDate,
      saleTime,
      paymentMethod: salePaymentMethod,
      salesChannel: saleChannel,
      productName: productNameSummary,
      itemsSummary,
      items: cartItems,
      totalQuantity: saleTotals.totalQuantity,
      subtotalAmount: Math.round(saleTotals.subtotalAmount * 100) / 100,
      discountAmount: Math.round(saleTotals.discountAmount * 100) / 100,
      shippingAmount: Math.round(saleTotals.shippingAmount * 100) / 100,
      totalAmount: Math.round(saleTotals.totalAmount * 100) / 100,
      totalCost: Math.round(saleTotals.totalCost * 100) / 100,
      netProfit: Math.round(saleTotals.netProfit * 100) / 100,
      totalWeightGrams: Math.round(saleTotals.totalWeightGrams),
      notes: saleNotes.trim(),
      status: saleStatus,
    });

    setSaleNotes('');
    setSaleDiscount('0');
    setSaleShipping('0');
    setIsRegisterSaleModalOpen(false);
    setActiveTab('sales_history');
    notify(
      `Venda para "${saleClientName.trim()}" registrada e lançada automaticamente no Fluxo de Caixa!`
    );
  };

  return (
    <section
      id="workspace-produtos-vendas"
      aria-label="Catálogo de Produtos Criados e Registro de Vendas"
      className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-4 sm:p-6 shadow-sm overflow-hidden"
    >
      {/* Top Header of the Product & Sales Workspace */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-md shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Meus Produtos Criados & Registro de Vendas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transforme o cálculo atual em produto de catálogo e registre vendas com dia, horário, cliente e entrada automática no Fluxo de Caixa
            </p>
          </div>
        </div>

        {/* Action & Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <button
            type="button"
            data-testid="btn-open-create-product"
            onClick={() => setIsCreateProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0D0F14] dark:bg-[#1D63FF] px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 shadow-sm"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            Criar Produto da Calculadora
          </button>

          <div className="flex items-center gap-1 rounded-2xl sm:rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1 overflow-x-auto max-w-full">
            <button
              type="button"
              data-testid="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'catalog'
                  ? 'bg-white dark:bg-[#181C26] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Meus Produtos ({products.length})
            </button>
            <button
              type="button"
              data-testid="tab-new-sale"
              onClick={() => {
                setSaleDate(getNowDateIso());
                setSaleTime(getNowTimeHm());
                setActiveTab('new_sale');
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'new_sale'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              + Registrar Venda
            </button>
            <button
              type="button"
              data-testid="tab-sales-history"
              onClick={() => setActiveTab('sales_history')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'sales_history'
                  ? 'bg-white dark:bg-[#181C26] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Vendas Realizadas ({sales.length})
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            {feedbackMsg}
          </span>
          <button
            type="button"
            onClick={onNavigateToCashflow}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            Ver no Fluxo de Caixa
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: CATÁLOGO DE PRODUTOS CRIADOS */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <div className="mt-6">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-400" />
              <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                Nenhum produto cadastrado no catálogo
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Use os parâmetros calculados acima para salvar seu primeiro produto 3D e registrar vendas.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateProductModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1D63FF] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
              >
                <PackagePlus className="h-4 w-4" />
                Criar Primeiro Produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {products.map((prod) => {
                const unitProfit = prod.unitPrice - prod.unitCost;
                return (
                  <div
                    key={prod.id}
                    data-testid={`product-card-${prod.id}`}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0D0F14] p-4 transition-all hover:border-[#1D63FF]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-bold text-[#1D63FF]">
                          {prod.sku} · {prod.technology === 'SLA_Resina' ? 'SLA' : 'FDM'}
                        </span>
                        <span className="font-mono tabular-nums">
                          Estoque: {prod.stockQuantity} un
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                        {prod.name}
                      </h3>

                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {prod.category} · {prod.weightGrams}g · {prod.printTimeHours}h
                        {prod.printTimeMinutes > 0 ? `${prod.printTimeMinutes}m` : ''}
                      </div>

                      {prod.description && (
                        <p className="mt-2 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {prod.description}
                        </p>
                      )}

                      {/* 3D Model Attachment Badge & Download */}
                      {prod.arquivo3dUrl && prod.arquivo3dNome && (
                        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="rounded bg-[#1D63FF] px-1.5 py-0.5 font-mono text-[9px] font-black text-white uppercase">
                              {prod.arquivo3dFormato?.replace('.', '') || '3D'}
                            </span>
                            <span className="truncate font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {prod.arquivo3dNome}
                            </span>
                            {prod.arquivo3dTamanho && (
                              <span className="text-[9px] text-slate-400 shrink-0">({prod.arquivo3dTamanho})</span>
                            )}
                          </div>
                          <a
                            href={prod.arquivo3dUrl}
                            download={prod.arquivo3dNome}
                            title="Baixar arquivo 3D"
                            className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#14171F] px-2 py-1 text-[10px] font-extrabold text-[#1D63FF] shadow-xs hover:bg-[#1D63FF] hover:text-white transition-colors ml-1.5 shrink-0"
                          >
                            <Download className="h-3 w-3" />
                            Baixar 3D
                          </a>
                        </div>
                      )}

                      {/* Marketplace suggested prices badges */}
                      {prod.marketplacePrices && Object.keys(prod.marketplacePrices).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prod.marketplacePrices.shopee && (
                            <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[9px] font-black text-orange-600 dark:text-orange-400">
                              Shopee: {formatCurrencyBRL(typeof prod.marketplacePrices.shopee === 'number' ? prod.marketplacePrices.shopee : prod.marketplacePrices.shopee.listingPrice)}
                            </span>
                          )}
                          {prod.marketplacePrices.mercadoLivre && (
                            <span className="rounded-md bg-yellow-500/15 border border-yellow-500/30 px-1.5 py-0.5 text-[9px] font-black text-yellow-700 dark:text-yellow-400">
                              ML: {formatCurrencyBRL(typeof prod.marketplacePrices.mercadoLivre === 'number' ? prod.marketplacePrices.mercadoLivre : prod.marketplacePrices.mercadoLivre.listingPrice)}
                            </span>
                          )}
                          {prod.marketplacePrices.amazon && (
                            <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:text-blue-400">
                              Amazon: {formatCurrencyBRL(typeof prod.marketplacePrices.amazon === 'number' ? prod.marketplacePrices.amazon : prod.marketplacePrices.amazon.listingPrice)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Extra supplies */}
                      {prod.extraSupplies && prod.extraSupplies.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <span>🔩</span>
                          <span>
                            {prod.extraSupplies.length} {prod.extraSupplies.length === 1 ? 'insumo extra' : 'insumos extras'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-200/70 dark:border-slate-800 pt-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">Preço de Venda</div>
                          <div className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrencyBRL(prod.unitPrice)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Lucro / un</div>
                          <div className="text-xs font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{formatCurrencyBRL(unitProfit)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartSaleWithProduct(prod)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Registrar Venda
                        </button>
                        <button
                          type="button"
                          onClick={() => onLoadProductIntoCalculator(prod)}
                          title="Carregar parâmetros na calculadora"
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1D63FF] transition-colors whitespace-nowrap shrink-0"
                        >
                          Calcular
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(prod)}
                          aria-label={`Excluir produto ${prod.name}`}
                          className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FORMULÁRIO COMPLETO DE REGISTRO DE VENDA */}
      {/* ========================================================= */}
      {activeTab === 'new_sale' && (
        <form
          onSubmit={handleRegisterSaleSubmit}
          data-testid="form-register-sale"
          className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-12"
        >
          {/* Left Column (7 cols): Produtos da Venda + Cliente + Data e Horário + Detalhes */}
          <div className="space-y-5 xl:col-span-7">
            {saleError && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500"
              >
                {saleError}
              </div>
            )}

            {/* 1. Seleção de Produtos Incluídos na Venda */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0D0F14] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    1. Produtos Incluídos na Venda
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione um ou mais produtos do seu catálogo e ajuste quantidades ou valor unitário
                  </p>
                </div>
              </div>

              {/* Add Product Selector Bar */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Selecionar produto para adicionar à venda"
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="flex-1 min-w-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} ({formatCurrencyBRL(p.unitPrice)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSelectedProductToCart}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Incluir Produto
                </button>
              </div>

              {/* Cart Items List */}
              <div className="mt-4 space-y-2.5">
                {cartItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-4 text-center text-xs text-slate-500">
                    Nenhum produto selecionado. Escolha um produto acima e clique em "Incluir Produto".
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.productId}
                      className="grid grid-cols-12 items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#14171F] p-3 text-xs"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {item.sku} · Custo un: {formatCurrencyBRL(item.unitCost)}
                        </div>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-400">
                          Qtd (un)
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          aria-label={`Quantidade de ${item.productName}`}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateCartItemQty(
                              item.productId,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 font-mono font-bold tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-400">
                          Preço Un. (R$)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.10"
                          aria-label={`Preço unitário de ${item.productName}`}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateCartItemPrice(
                              item.productId,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 font-mono font-bold tabular-nums text-slate-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                        <div className="text-right font-mono font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrencyBRL(item.unitPrice * item.quantity)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartItemQty(item.productId, 0)}
                          aria-label={`Remover ${item.productName} da venda`}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Cliente, Dia, Horário e Canal */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0D0F14] p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                2. Cliente, Dia, Horário & Canal da Venda
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registre para quem foi vendido, quando ocorreu e como o pagamento foi realizado
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sale-client-name"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    <User className="h-3.5 w-3.5 text-[#1D63FF]" />
                    Qual Cliente / Empresa *
                  </label>
                  <input
                    id="sale-client-name"
                    type="text"
                    required
                    value={saleClientName}
                    onChange={(e) => setSaleClientName(e.target.value)}
                    placeholder="Ex: TechNova Automação ou Mariana Costa"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-client-contact"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Contato / WhatsApp / CPF-CNPJ
                  </label>
                  <input
                    id="sale-client-contact"
                    type="text"
                    value={saleClientContact}
                    onChange={(e) => setSaleClientContact(e.target.value)}
                    placeholder="Ex: (11) 99876-5432 · @mariana"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-date"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#1D63FF]" />
                    Que Dia (Data da Venda) *
                  </label>
                  <input
                    id="sale-date"
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-time"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    <Clock className="h-3.5 w-3.5 text-[#1D63FF]" />
                    Que Horário (Hora da Venda) *
                  </label>
                  <input
                    id="sale-time"
                    type="time"
                    required
                    value={saleTime}
                    onChange={(e) => setSaleTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-payment-method"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-[#1D63FF]" />
                    Forma de Pagamento
                  </label>
                  <select
                    id="sale-payment-method"
                    value={salePaymentMethod}
                    onChange={(e) => setSalePaymentMethod(e.target.value as PaymentMethod)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sale-channel"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Canal de Venda
                  </label>
                  <select
                    id="sale-channel"
                    value={saleChannel}
                    onChange={(e) => setSaleChannel(e.target.value as SalesChannel)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    {Object.entries(SALES_CHANNEL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sale-discount"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Desconto Concedido (R$)
                  </label>
                  <input
                    id="sale-discount"
                    type="number"
                    min={0}
                    step="0.50"
                    value={saleDiscount}
                    onChange={(e) => setSaleDiscount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sale-shipping"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Frete / Taxa de Entrega (R$)
                  </label>
                  <input
                    id="sale-shipping"
                    type="number"
                    min={0}
                    step="0.50"
                    value={saleShipping}
                    onChange={(e) => setSaleShipping(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="sale-notes"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Observações Importantes (Cor da peça, acabamento, envio, NF)
                  </label>
                  <input
                    id="sale-notes"
                    type="text"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="Ex: Peça impressa em PLA Silk Azul Royal, entrega via motoboy às 17h"
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Resumo Financeiro da Venda & Integração com Fluxo de Caixa */}
          <div className="rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-6 text-white shadow-xl xl:col-span-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-blue-100">
                Resumo da Venda
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-mono font-bold text-white">
                <Wallet className="h-3 w-3" />
                Integra ao Fluxo de Caixa
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-300 dark:text-blue-100">
                Valor Total Recebido na Venda
              </div>
              <div
                data-testid="sale-summary-total"
                className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-white"
              >
                {formatCurrencyBRL(saleTotals.totalAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-300 dark:text-blue-100">
                Cliente:{' '}
                <strong className="text-white">
                  {saleClientName.trim() || 'Não informado'}
                </strong>{' '}
                · {saleDate} às {saleTime}
              </div>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-white/15 pt-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-300 dark:text-blue-100">
                  Itens ({saleTotals.totalQuantity} un):
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {formatCurrencyBRL(saleTotals.subtotalAmount)}
                </span>
              </div>
              {saleTotals.discountAmount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Desconto concedido:</span>
                  <span className="font-mono font-bold tabular-nums">
                    -{formatCurrencyBRL(saleTotals.discountAmount)}
                  </span>
                </div>
              )}
              {saleTotals.shippingAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-300 dark:text-blue-100">
                    Frete / Entrega:
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    +{formatCurrencyBRL(saleTotals.shippingAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-300 dark:text-blue-100">
                  Custo Real de Produção ({saleTotals.totalWeightGrams}g):
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {formatCurrencyBRL(saleTotals.totalCost)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-2.5 text-sm font-extrabold">
                <span>Lucro Líquido Real:</span>
                <span className="font-mono tabular-nums text-emerald-400 dark:text-white">
                  +{formatCurrencyBRL(saleTotals.netProfit)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 dark:bg-[#0D0F14]/40 px-4 py-3 text-xs">
              <span>Status Financeiro</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSaleStatus('concluida')}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    saleStatus === 'concluida'
                      ? 'bg-emerald-500 text-white'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Pago / Concluída
                </button>
                <button
                  type="button"
                  onClick={() => setSaleStatus('pendente')}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    saleStatus === 'pendente'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  A Receber
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="btn-confirm-sale"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 dark:bg-[#0D0F14] px-6 py-3.5 text-xs font-extrabold text-white hover:opacity-95 transition-opacity shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Venda & Lançar no Fluxo de Caixa
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 3: HISTÓRICO DE VENDAS REALIZADAS */}
      {/* ========================================================= */}
      {activeTab === 'sales_history' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Todas as vendas registradas abaixo entram automaticamente como receita no seu{' '}
              <button
                type="button"
                onClick={onNavigateToCashflow}
                className="font-bold text-[#1D63FF] underline hover:opacity-80"
              >
                Fluxo de Caixa
              </button>
              .
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
              Nenhuma venda registrada ainda. Clique em "+ Registrar Venda" para lançar sua primeira venda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-3 font-semibold">Dia & Horário</th>
                    <th className="pb-3 px-3 font-semibold">Cliente</th>
                    <th className="pb-3 px-3 font-semibold">Produtos Vendidos</th>
                    <th className="pb-3 px-3 font-semibold">Pagamento · Canal</th>
                    <th className="pb-3 px-3 text-right font-semibold">Total / Lucro</th>
                    <th className="pb-3 pl-3 text-right font-semibold">Fluxo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                  {sales.map((sale) => (
                    <tr
                      key={sale.id}
                      data-testid={`sale-row-${sale.id}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 pr-3 font-mono tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sale.saleDate}
                        </div>
                        <div className="text-[11px] text-[#1D63FF]">
                          às {sale.saleTime}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sale.clientName}
                        </div>
                        {sale.clientContact && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {sale.clientContact}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sale.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {sale.itemsSummary}
                        </div>
                        {sale.notes && (
                          <div className="mt-0.5 text-[11px] italic text-slate-400">
                            Obs: {sale.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        <div>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</div>
                        <div className="text-[11px] text-slate-400">
                          {SALES_CHANNEL_LABELS[sale.salesChannel]}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrencyBRL(sale.totalAmount)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Lucro: +{formatCurrencyBRL(sale.netProfit)}
                        </div>
                      </td>

                      <td className="py-3.5 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={onNavigateToCashflow}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                          >
                            No Caixa
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleToDelete(sale)}
                            aria-label={`Excluir venda de ${sale.clientName}`}
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
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR PRODUTO A PARTIR DA CALCULADORA */}
      {/* ========================================================= */}
      {isCreateProductModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-create-product-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D63FF] text-white">
                  <PackagePlus className="h-5 w-5" />
                </span>
                <div>
                  <h3
                    id="modal-create-product-title"
                    className="text-base font-extrabold text-slate-900 dark:text-white"
                  >
                    Criar Produto a partir da Calculadora
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Salve esta peça no seu catálogo para registrar vendas rapidamente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProductModalOpen(false)}
                aria-label="Fechar modal"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => handleCreateProductSubmit(e, false)}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  htmlFor="modal-prod-name"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Nome Comercial do Produto *
                </label>
                <input
                  id="modal-prod-name"
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="modal-prod-sku"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Código SKU
                  </label>
                  <input
                    id="modal-prod-sku"
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-prod-category"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Categoria
                  </label>
                  <select
                    id="modal-prod-category"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Calculated Cost vs Selling Price */}
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-100/80 dark:bg-[#0D0F14] p-3.5 text-xs">
                <div>
                  <div className="text-[11px] text-slate-500">Custo Real / un</div>
                  <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrencyBRL(currentBreakdown.unitCost)}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="modal-prod-price"
                    className="block text-[11px] font-bold text-[#1D63FF]"
                  >
                    Preço Venda (R$)
                  </label>
                  <input
                    id="modal-prod-price"
                    type="number"
                    min={0.01}
                    step="0.10"
                    value={prodCustomPrice}
                    onChange={(e) => setProdCustomPrice(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171F] px-2 py-1 font-mono text-xs font-extrabold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="modal-prod-stock"
                    className="block text-[11px] font-semibold text-slate-500"
                  >
                    Estoque Inicial
                  </label>
                  <input
                    id="modal-prod-stock"
                    type="number"
                    min={0}
                    step={1}
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#14171F] px-2 py-1 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 📦 Arquivo de Impressão 3D (Opcional) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📦</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Arquivo de Impressão 3D (Opcional)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Formatos aceitos: .stl, .3mf, .gcode, .obj, .zip
                      </div>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInput3DRef}
                    accept=".stl,.3mf,.gcode,.obj,.zip"
                    onChange={handle3DFileSelected}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isProcessing3DFile}
                    onClick={() => fileInput3DRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#14171F] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#1D63FF] transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-[#1D63FF]" />
                    <span>{arquivo3dNome ? 'Trocar Arquivo' : 'Anexar Arquivo 3D'}</span>
                  </button>
                </div>

                {arquivo3dNome && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded bg-[#1D63FF] px-2 py-0.5 font-mono text-[10px] font-black text-white uppercase">
                        {arquivo3dFormato?.replace('.', '') || '3D'}
                      </span>
                      <span className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {arquivo3dNome}
                      </span>
                      {arquivo3dTamanho && (
                        <span className="text-[10px] text-slate-400">({arquivo3dTamanho})</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setArquivo3dUrl('');
                        setArquivo3dNome('');
                        setArquivo3dTamanho('');
                        setArquivo3dFormato('');
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:underline ml-2"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Extra Supplies & Marketplace Summary Pills */}
              {(Boolean(currentCalcParams.extraSupplies?.length) || marketplaceSummaries.length > 0) && (
                <div className="space-y-1.5 rounded-2xl bg-slate-50 dark:bg-[#0D0F14] p-3 text-[11px]">
                  {currentCalcParams.extraSupplies && currentCalcParams.extraSupplies.length > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span>🔩</span>
                      <span>
                        Insumos Extras embutidos:{' '}
                        <strong>
                          {currentCalcParams.extraSupplies.map((s) => `${s.quantity}x ${s.name}`).join(', ')}
                        </strong>
                      </span>
                    </div>
                  )}

                  {marketplaceSummaries.length > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span>🛒</span>
                      <span>
                        Marketplaces vinculados:{' '}
                        <strong>
                          {marketplaceSummaries
                            .map((m) => `${m.platformName} (${formatCurrencyBRL(m.listingPrice)})`)
                            .join(' · ')}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="modal-prod-desc"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Especificação / Notas do Produto
                </label>
                <input
                  id="modal-prod-desc"
                  type="text"
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => handleCreateProductSubmit(e, true)}
                  data-testid="btn-save-product-and-sell"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Salvar & Já Registrar Venda
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-product-only"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1D63FF] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors"
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Salvar no Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCT */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto do seu catálogo?"
        itemLabel={
          productToDelete
            ? `${productToDelete.name} (${productToDelete.sku})`
            : undefined
        }
        onCancel={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            onDeleteProduct(productToDelete.id);
            notify(`Produto "${productToDelete.name}" excluído.`);
            setProductToDelete(null);
          }
        }}
      />

      {/* CONFIRM DELETE SALE */}
      <ConfirmDeleteModal
        isOpen={Boolean(saleToDelete)}
        title="Excluir Venda Registrada"
        description="Tem certeza que deseja excluir esta venda? O lançamento vinculado também será removido do Fluxo de Caixa."
        itemLabel={
          saleToDelete
            ? `${saleToDelete.clientName} — ${saleToDelete.productName} (${formatCurrencyBRL(
                saleToDelete.totalAmount
              )})`
            : undefined
        }
        onCancel={() => setSaleToDelete(null)}
        onConfirm={() => {
          if (saleToDelete) {
            onDeleteSale(saleToDelete);
            notify(`Venda de "${saleToDelete.clientName}" excluída.`);
            setSaleToDelete(null);
          }
        }}
      />
    </section>
  );
};
