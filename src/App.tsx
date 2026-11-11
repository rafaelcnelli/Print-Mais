import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  deleteProductFromFirestore,
  deleteQuoteFromFirestore,
  deleteSaleFromFirestore,
  deleteSpoolFromFirestore,
  deleteTransactionFromFirestore,
  handleFirestoreError,
  loginWithEmail,
  OperationType,
  registerWithEmail,
  saveProductToFirestore,
  saveQuoteToFirestore,
  saveSaleToFirestore,
  saveSpoolToFirestore,
  saveTransactionToFirestore,
  signInWithGoogle,
  signOutUser,
  updateProductInFirestore,
  updateProductStockInFirestore,
  updateQuoteInFirestore,
  updateQuoteStatusInFirestore,
  updateSpoolInFirestore,
  updateSpoolWeightInFirestore,
  updateTransactionInFirestore,
} from './firebase';
import {
  CalculatorParams,
  ProductCategoryRecord,
  ProductRecord,
  QuoteRecord,
  SaleRecord,
  SpoolRecord,
  TransactionRecord,
} from './types';
import {
  CALCULATOR_PRESETS,
  formatCurrencyBRL,
  PRINTMAIS_PLANS,
  SubscriptionPlanId,
} from './utils/pricing';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_QUOTES,
  INITIAL_SALES,
  INITIAL_SPOOLS,
  INITIAL_TRANSACTIONS,
} from './utils/seedData';
import { AppAccount, AuthView } from './components/AuthView';
import { LandingPageView } from './components/LandingPageView';
import { CalculatorView } from './components/CalculatorView';
import { ProductsCatalogView } from './components/ProductsCatalogView';
import { CloseOrderDetails, OrdersView } from './components/OrdersView';
import { CashFlowView } from './components/CashFlowView';
import { InventoryView } from './components/InventoryView';
import { ReportsDashboardView } from './components/ReportsDashboardView';
import { ConfirmLogoutModal } from './components/ConfirmLogoutModal';
import { MobileDrawerMenu } from './components/MobileDrawerMenu';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  BarChart3,
  Box,
  Calculator,
  Disc,
  FolderKanban,
  LogOut,
  Menu,
  Moon,
  Sun,
  Tags,
  Wallet,
} from 'lucide-react';

type ActiveScreen =
  | 'calculator'
  | 'products'
  | 'orders'
  | 'cashflow'
  | 'inventory'
  | 'reports';

const STORAGE_KEYS = {
  THEME: '3dpm_theme_v1',
  ACTIVE_ACCOUNT: '3dpm_active_account_v1',
  LOCAL_USERS: '3dpm_registered_users_v1',
};

interface StoredLocalUser {
  uid: string;
  displayName: string;
  email: string;
  password: string;
  plan?: SubscriptionPlanId;
}

function getScopedKey(prefix: string, uid: string) {
  return `${prefix}_${uid}`;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('calculator');
  const [publicScreen, setPublicScreen] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authSelectedPlan, setAuthSelectedPlan] = useState<SubscriptionPlanId>('pro_annual');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved ? saved === 'dark' : true;
  });

  // Active Account State (starts null -> shows Landing Page first, unless ?autostart=1)
  const [account, setAccount] = useState<AppAccount | null>(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1'
    ) {
      return {
        uid: 'local_studio',
        displayName: 'Oficina Maker Pro',
        email: 'contato@printmais.com.br',
        mode: 'local_account',
        plan: 'pro_annual',
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [fbUser, setFbUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Scoped Data State per User Account
  const [quotes, setQuotes] = useState<QuoteRecord[]>(INITIAL_QUOTES);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    INITIAL_TRANSACTIONS
  );
  const [spools, setSpools] = useState<SpoolRecord[]>(INITIAL_SPOOLS);
  const [products, setProducts] = useState<ProductRecord[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] =
    useState<ProductCategoryRecord[]>(INITIAL_CATEGORIES);
  const [sales, setSales] = useState<SaleRecord[]>(INITIAL_SALES);

  // Calculator parameters state
  const [calcParams, setCalcParams] = useState<CalculatorParams>({
    clientName: 'TechNova Automação',
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
  });

  // Sync theme with <html class="dark">
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist active account session
  useEffect(() => {
    if (account) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, JSON.stringify(account));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
    }
  }, [account]);

  // Load scoped local data whenever account changes (for local_account or initial cache)
  useEffect(() => {
    if (!account) return;
    try {
      const cRaw = localStorage.getItem(
        getScopedKey('3dpm_categories', account.uid)
      );
      setCategories(cRaw ? JSON.parse(cRaw) : INITIAL_CATEGORIES);
    } catch {
      setCategories(INITIAL_CATEGORIES);
    }

    if (account.mode === 'local_account') {
      try {
        const qRaw = localStorage.getItem(getScopedKey('3dpm_quotes', account.uid));
        const tRaw = localStorage.getItem(getScopedKey('3dpm_tx', account.uid));
        const sRaw = localStorage.getItem(getScopedKey('3dpm_spools', account.uid));
        const pRaw = localStorage.getItem(getScopedKey('3dpm_products', account.uid));
        const slRaw = localStorage.getItem(getScopedKey('3dpm_sales', account.uid));
        setQuotes(qRaw ? JSON.parse(qRaw) : INITIAL_QUOTES);
        setTransactions(tRaw ? JSON.parse(tRaw) : INITIAL_TRANSACTIONS);
        setSpools(sRaw ? JSON.parse(sRaw) : INITIAL_SPOOLS);
        setProducts(pRaw ? JSON.parse(pRaw) : INITIAL_PRODUCTS);
        setSales(slRaw ? JSON.parse(slRaw) : INITIAL_SALES);
      } catch {
        setQuotes(INITIAL_QUOTES);
        setTransactions(INITIAL_TRANSACTIONS);
        setSpools(INITIAL_SPOOLS);
        setProducts(INITIAL_PRODUCTS);
        setSales(INITIAL_SALES);
      }
    }
  }, [account]);

  // Persist categories for both local and Firebase accounts
  useEffect(() => {
    if (account) {
      localStorage.setItem(
        getScopedKey('3dpm_categories', account.uid),
        JSON.stringify(categories)
      );
    }
  }, [categories, account]);

  // Save scoped local data when in local_account mode
  useEffect(() => {
    if (account?.mode === 'local_account') {
      localStorage.setItem(
        getScopedKey('3dpm_quotes', account.uid),
        JSON.stringify(quotes)
      );
    }
  }, [quotes, account]);

  useEffect(() => {
    if (account?.mode === 'local_account') {
      localStorage.setItem(
        getScopedKey('3dpm_tx', account.uid),
        JSON.stringify(transactions)
      );
    }
  }, [transactions, account]);

  useEffect(() => {
    if (account?.mode === 'local_account') {
      localStorage.setItem(
        getScopedKey('3dpm_spools', account.uid),
        JSON.stringify(spools)
      );
    }
  }, [spools, account]);

  useEffect(() => {
    if (account?.mode === 'local_account') {
      localStorage.setItem(
        getScopedKey('3dpm_products', account.uid),
        JSON.stringify(products)
      );
    }
  }, [products, account]);

  useEffect(() => {
    if (account?.mode === 'local_account') {
      localStorage.setItem(
        getScopedKey('3dpm_sales', account.uid),
        JSON.stringify(sales)
      );
    }
  }, [sales, account]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setFbUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setAccount({
          uid: currentUser.uid,
          displayName:
            currentUser.displayName ||
            currentUser.email?.split('@')[0] ||
            'Maker Pro',
          email: currentUser.email || '',
          mode: 'firebase',
        });
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time listeners when authenticated via Firebase
  useEffect(() => {
    if (!isAuthReady || !fbUser || account?.mode !== 'firebase') return;

    // Only attach Firestore listeners if email is verified or Google auth, otherwise fallback to local scoped storage
    if (!fbUser.emailVerified) {
      return;
    }

    const quotesQuery = query(
      collection(db, 'quotes'),
      where('ownerId', '==', fbUser.uid)
    );
    const unsubQuotes = onSnapshot(
      quotesQuery,
      (snap) => {
        if (snap.empty) {
          setQuotes([]);
          return;
        }
        const docs: QuoteRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            clientName: data.clientName,
            projectName: data.projectName,
            technology: data.technology,
            presetId: data.presetId,
            weightGrams: data.weightGrams,
            filamentPricePerKg: data.filamentPricePerKg,
            printTimeHours: data.printTimeHours,
            printTimeMinutes: data.printTimeMinutes,
            printerPowerWatts: data.printerPowerWatts,
            energyRateKwh: data.energyRateKwh,
            printerCost: data.printerCost,
            printerLifespanHours: data.printerLifespanHours,
            laborHourlyRate: data.laborHourlyRate,
            laborHours: data.laborHours,
            batchQuantity: data.batchQuantity,
            profitMarginPercent: data.profitMarginPercent,
            failureRiskPercent: data.failureRiskPercent,
            unitCost: data.unitCost,
            unitPrice: data.unitPrice,
            totalPrice: data.totalPrice,
            netProfit: data.netProfit,
            status: data.status,
            createdAtIso: new Date().toISOString(),
          };
        });
        setQuotes(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'quotes')
    );

    const txQuery = query(
      collection(db, 'transactions'),
      where('ownerId', '==', fbUser.uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        if (snap.empty) {
          setTransactions([]);
          return;
        }
        const docs: TransactionRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            title: data.title,
            type: data.type,
            category: data.category,
            amount: data.amount,
            dateIso: data.dateIso,
            notes: data.notes || '',
            createdAtIso: new Date().toISOString(),
          };
        });
        setTransactions(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    const spoolsQuery = query(
      collection(db, 'spools'),
      where('ownerId', '==', fbUser.uid)
    );
    const unsubSpools = onSnapshot(
      spoolsQuery,
      (snap) => {
        if (snap.empty) {
          setSpools([]);
          return;
        }
        const docs: SpoolRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            name: data.name,
            brand: data.brand,
            materialType: data.materialType,
            colorName: data.colorName,
            colorHex: data.colorHex,
            initialWeightGrams: data.initialWeightGrams,
            remainingWeightGrams: data.remainingWeightGrams,
            pricePaid: data.pricePaid,
            minAlertGrams: data.minAlertGrams,
            createdAtIso: new Date().toISOString(),
          };
        });
        setSpools(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'spools')
    );

    const productsQuery = query(
      collection(db, 'products'),
      where('ownerId', '==', fbUser.uid)
    );
    const unsubProducts = onSnapshot(
      productsQuery,
      (snap) => {
        if (snap.empty) {
          setProducts([]);
          return;
        }
        const docs: ProductRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            name: data.name,
            sku: data.sku,
            category: data.category,
            technology: data.technology,
            weightGrams: data.weightGrams,
            printTimeHours: data.printTimeHours,
            printTimeMinutes: data.printTimeMinutes,
            filamentPricePerKg: data.filamentPricePerKg,
            unitCost: data.unitCost,
            unitPrice: data.unitPrice,
            profitMarginPercent: data.profitMarginPercent,
            stockQuantity: data.stockQuantity,
            description: data.description || '',
            createdAtIso: new Date().toISOString(),
          };
        });
        setProducts(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const salesQuery = query(
      collection(db, 'sales'),
      where('ownerId', '==', fbUser.uid)
    );
    const unsubSales = onSnapshot(
      salesQuery,
      (snap) => {
        if (snap.empty) {
          setSales([]);
          return;
        }
        const docs: SaleRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let parsedItems = [];
          try {
            parsedItems = JSON.parse(data.itemsSummary || '[]');
          } catch {
            parsedItems = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            clientName: data.clientName,
            clientContact: data.clientContact || '',
            saleDate: data.saleDate,
            saleTime: data.saleTime,
            paymentMethod: data.paymentMethod,
            salesChannel: data.salesChannel,
            productName: data.productName,
            itemsSummary: data.itemsSummary,
            items: Array.isArray(parsedItems) ? parsedItems : [],
            totalQuantity: data.totalQuantity,
            subtotalAmount: data.subtotalAmount,
            discountAmount: data.discountAmount,
            shippingAmount: data.shippingAmount,
            totalAmount: data.totalAmount,
            totalCost: data.totalCost,
            netProfit: data.netProfit,
            totalWeightGrams: data.totalWeightGrams,
            transactionId: data.transactionId,
            notes: data.notes || '',
            status: data.status,
            createdAtIso: new Date().toISOString(),
          };
        });
        setSales(docs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sales')
    );

    return () => {
      unsubQuotes();
      unsubTx();
      unsubSpools();
      unsubProducts();
      unsubSales();
    };
  }, [isAuthReady, fbUser, account]);

  const canUseCloudFirestore = Boolean(
    fbUser && fbUser.emailVerified && account?.mode === 'firebase'
  );

  // Handlers for Product-Based Quotes & Orders
  const handleCreateQuote = async (
    quoteInput: Omit<QuoteRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ): Promise<QuoteRecord> => {
    const ownerUid = account?.uid || 'local_studio';
    const newQuote: QuoteRecord = {
      ...quoteInput,
      id: `quote_${Date.now()}`,
      ownerId: ownerUid,
      createdAtIso: new Date().toISOString(),
    };

    if (canUseCloudFirestore) {
      await saveQuoteToFirestore(newQuote);
    } else {
      setQuotes((prev) => [newQuote, ...prev]);
    }

    return newQuote;
  };

  const handleUpdateQuote = async (updatedQuote: QuoteRecord) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q))
    );
    if (canUseCloudFirestore && updatedQuote.status !== 'completed') {
      await updateQuoteInFirestore(updatedQuote);
    }

    // If the quote/order is completed, also keep linked Cash Flow transactions updated
    if (updatedQuote.status === 'completed') {
      setTransactions((prev) =>
        prev.map((tx) => {
          if (
            tx.notes?.includes(`#${updatedQuote.id.slice(-6)}`) ||
            (tx.clientName === updatedQuote.clientName &&
              tx.title.includes(updatedQuote.projectName.slice(0, 15)))
          ) {
            return {
              ...tx,
              title: `Venda: ${updatedQuote.projectName} — ${updatedQuote.clientName}`,
              amount: updatedQuote.totalPrice,
              clientName: updatedQuote.clientName,
            };
          }
          return tx;
        })
      );
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    if (canUseCloudFirestore) {
      await updateQuoteStatusInFirestore(quoteId, 'approved');
    } else {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'approved' } : q))
      );
    }
  };

  const handleConvertQuoteToOrder = async (
    quote: QuoteRecord,
    orderDetails?: CloseOrderDetails
  ) => {
    if (canUseCloudFirestore) {
      await updateQuoteStatusInFirestore(quote.id, 'completed');
    } else {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, status: 'completed' } : q))
      );
    }

    // Optional Filament Stock Deduction per product sold
    if (
      orderDetails?.filamentDeductions &&
      orderDetails.filamentDeductions.length > 0
    ) {
      const deductionsBySpool = new Map<string, number>();
      for (const ded of orderDetails.filamentDeductions) {
        if (ded.spoolId && ded.gramsUsed > 0) {
          deductionsBySpool.set(
            ded.spoolId,
            (deductionsBySpool.get(ded.spoolId) || 0) + ded.gramsUsed
          );
        }
      }

      for (const [spoolId, totalGramsToDeduct] of deductionsBySpool.entries()) {
        const targetSpool = spools.find((s) => s.id === spoolId);
        if (targetSpool) {
          const nextRemaining = Math.max(
            0,
            targetSpool.remainingWeightGrams - totalGramsToDeduct
          );
          await handleUpdateSpoolWeight(spoolId, nextRemaining);
        }
      }
    }

    const now = new Date();
    const saleDate = orderDetails?.saleDate || now.toISOString().slice(0, 10);
    const saleTime =
      orderDetails?.saleTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
    const paymentMethod = orderDetails?.paymentMethod || 'PIX';
    const salesChannel = orderDetails?.salesChannel || 'WhatsApp';

    const quoteItems =
      quote.items && quote.items.length > 0
        ? quote.items
        : [
            {
              productId: 'prod_seed_1',
              productName: quote.projectName,
              sku: 'PRD-ORCAMENTO',
              quantity: Math.max(1, quote.batchQuantity || 1),
              unitCost: quote.unitCost,
              unitPrice: quote.unitPrice,
              weightGrams: quote.weightGrams,
            },
          ];

    const totalQty = quoteItems.reduce((acc, i) => acc + i.quantity, 0);
    const subtotalAmount = quoteItems.reduce(
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

    const filamentSummaryNote =
      orderDetails?.filamentDeductions &&
      orderDetails.filamentDeductions.length > 0
        ? ` · Filamento descontado: ${orderDetails.filamentDeductions
            .map((d) => `${d.gramsUsed}g`)
            .join(' + ')}`
        : '';

    await handleRegisterSale({
      clientName: quote.clientName,
      clientContact: quote.clientContact || '',
      saleDate,
      saleTime,
      paymentMethod,
      salesChannel,
      productName: quote.projectName,
      itemsSummary:
        quote.itemsSummary ||
        quoteItems
          .map(
            (i) =>
              `${i.quantity}x ${i.productName} (${i.sku}) @ ${formatCurrencyBRL(
                i.unitPrice
              )}`
          )
          .join(' + '),
      items: quoteItems,
      totalQuantity: Math.max(1, totalQty),
      subtotalAmount: Math.round(subtotalAmount * 100) / 100,
      discountAmount: quote.discountAmount || 0,
      shippingAmount: quote.shippingAmount || 0,
      totalAmount: quote.totalPrice,
      totalCost: Math.round(totalCost * 100) / 100,
      netProfit: quote.netProfit,
      totalWeightGrams: Math.round(totalWeightGrams),
      notes: `${
        orderDetails?.notes ||
        quote.notes ||
        `Pedido convertido a partir do orçamento #${quote.id.slice(-6)}`
      }${filamentSummaryNote}`,
      status: 'concluida',
    });
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (canUseCloudFirestore) {
      await deleteQuoteFromFirestore(quoteId);
    } else {
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    }
  };

  // Handlers for Products & Categories (Created inside Calculator or Catalog Page)
  const handleCreateProduct = async (
    productInput: Omit<ProductRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ): Promise<ProductRecord> => {
    const ownerUid = account?.uid || 'local_studio';
    const newProduct: ProductRecord = {
      ...productInput,
      id: `prod_${Date.now()}`,
      ownerId: ownerUid,
      createdAtIso: new Date().toISOString(),
    };

    if (canUseCloudFirestore) {
      await saveProductToFirestore(newProduct);
    } else {
      setProducts((prev) => [newProduct, ...prev]);
    }
    return newProduct;
  };

  const handleUpdateProduct = async (updatedProduct: ProductRecord) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    if (canUseCloudFirestore) {
      await updateProductInFirestore(updatedProduct);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (canUseCloudFirestore) {
      await deleteProductFromFirestore(productId);
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const handleCreateCategory = (
    catInput: Omit<ProductCategoryRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ): ProductCategoryRecord => {
    const ownerUid = account?.uid || 'local_studio';
    const newCat: ProductCategoryRecord = {
      ...catInput,
      id: `cat_${Date.now()}`,
      ownerId: ownerUid,
      createdAtIso: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  };

  // Handlers for Sales (Registered with Products, Date, Time, Client -> Enters CashFlow)
  const handleRegisterSale = async (
    saleInput: Omit<SaleRecord, 'id' | 'ownerId' | 'transactionId' | 'createdAtIso'>
  ) => {
    if (!account) return;
    const nowTs = Date.now();
    const newSaleId = `sale_${nowTs}`;
    const newTxId = `tx_sale_${nowTs}`;

    const newSale: SaleRecord = {
      ...saleInput,
      id: newSaleId,
      ownerId: account.uid,
      transactionId: newTxId,
      createdAtIso: new Date().toISOString(),
    };

    if (canUseCloudFirestore) {
      await saveSaleToFirestore(newSale);
    } else {
      setSales((prev) => [newSale, ...prev]);
    }

    // Deduct stock quantity for each sold product
    for (const item of newSale.items) {
      const targetProd = products.find((p) => p.id === item.productId);
      if (targetProd) {
        const nextStock = Math.max(0, targetProd.stockQuantity - item.quantity);
        if (canUseCloudFirestore) {
          await updateProductStockInFirestore(targetProd.id, nextStock);
        } else {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === targetProd.id ? { ...p, stockQuantity: nextStock } : p
            )
          );
        }
      }
    }

    // Automatically push completed sale into Cash Flow (Fluxo de Caixa)
    if (newSale.status === 'concluida') {
      const newTx: TransactionRecord = {
        id: newTxId,
        ownerId: account.uid,
        title: `Venda: ${newSale.productName} — ${newSale.clientName}`,
        type: 'income',
        category: newSale.totalQuantity >= 10 ? 'encomenda_lote' : 'venda_direta',
        amount: newSale.totalAmount,
        dateIso: newSale.saleDate,
        saleId: newSale.id,
        saleTime: newSale.saleTime,
        clientName: newSale.clientName,
        paymentMethod: newSale.paymentMethod,
        salesChannel: newSale.salesChannel,
        notes: `${newSale.saleTime} · ${newSale.paymentMethod} (${newSale.salesChannel}) · Lucro Líquido: +${formatCurrencyBRL(newSale.netProfit)}${newSale.notes ? ' · ' + newSale.notes : ''}`,
        createdAtIso: new Date().toISOString(),
      };

      if (canUseCloudFirestore) {
        await saveTransactionToFirestore(newTx);
      } else {
        setTransactions((prev) => [newTx, ...prev]);
      }
    }
  };

  const handleDeleteSale = async (sale: SaleRecord) => {
    if (canUseCloudFirestore) {
      await deleteSaleFromFirestore(sale.id);
    } else {
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
    }

    // Also remove the linked transaction from Cash Flow if present
    if (sale.transactionId) {
      if (canUseCloudFirestore) {
        await deleteTransactionFromFirestore(sale.transactionId);
      } else {
        setTransactions((prev) =>
          prev.filter((t) => t.id !== sale.transactionId && t.saleId !== sale.id)
        );
      }
    }
  };

  // Handlers for Cash Flow Transactions
  const handleAddTransaction = async (
    txInput: Omit<TransactionRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => {
    if (!account) return;
    const newTx: TransactionRecord = {
      ...txInput,
      id: `tx_${Date.now()}`,
      ownerId: account.uid,
      createdAtIso: new Date().toISOString(),
    };

    if (canUseCloudFirestore) {
      await saveTransactionToFirestore(newTx);
    } else {
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleUpdateTransaction = async (updatedTx: TransactionRecord) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );
    if (canUseCloudFirestore) {
      await updateTransactionInFirestore(updatedTx);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (canUseCloudFirestore) {
      await deleteTransactionFromFirestore(txId);
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== txId));
    }
  };

  // Handlers for Spools
  const handleAddSpool = async (
    spoolInput: Omit<SpoolRecord, 'id' | 'ownerId' | 'createdAtIso'>
  ) => {
    if (!account) return;
    const newSpool: SpoolRecord = {
      ...spoolInput,
      id: `spool_${Date.now()}`,
      ownerId: account.uid,
      createdAtIso: new Date().toISOString(),
    };

    if (canUseCloudFirestore) {
      await saveSpoolToFirestore(newSpool);
    } else {
      setSpools((prev) => [newSpool, ...prev]);
    }
  };

  const handleUpdateSpool = async (updatedSpool: SpoolRecord) => {
    setSpools((prev) =>
      prev.map((s) => (s.id === updatedSpool.id ? updatedSpool : s))
    );
    if (canUseCloudFirestore) {
      await updateSpoolInFirestore(updatedSpool);
    }
  };

  const handleUpdateSpoolWeight = async (
    spoolId: string,
    nextWeightGrams: number
  ) => {
    if (canUseCloudFirestore) {
      await updateSpoolWeightInFirestore(spoolId, nextWeightGrams);
    } else {
      setSpools((prev) =>
        prev.map((s) =>
          s.id === spoolId ? { ...s, remainingWeightGrams: nextWeightGrams } : s
        )
      );
    }
  };

  const handleDeleteSpool = async (spoolId: string) => {
    if (canUseCloudFirestore) {
      await deleteSpoolFromFirestore(spoolId);
    } else {
      setSpools((prev) => prev.filter((s) => s.id !== spoolId));
    }
  };

  // Authentication Handlers
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      const res = await signInWithGoogle();
      setAccount({
        uid: res.user.uid,
        displayName:
          res.user.displayName || res.user.email?.split('@')[0] || 'Maker Pro',
        email: res.user.email || '',
        mode: 'firebase',
      });
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível autenticar com o Google.'
      );
    }
  };

  const handleEmailAuth = async (params: {
    mode: 'login' | 'register';
    name: string;
    email: string;
    password: string;
    plan?: SubscriptionPlanId;
  }) => {
    setAuthError(null);
    const { mode, name, email, password, plan = 'pro_annual' } = params;

    if (import.meta.env.VITE_FIREBASE_EMAIL_AUTH_ENABLED === 'true') {
      if (mode === 'register') {
        const u = await registerWithEmail(name, email, password);
        setAccount({
          uid: u.uid,
          displayName: name || u.email?.split('@')[0] || 'Maker Pro',
          email: u.email || email,
          mode: 'firebase',
          plan,
        });
        return;
      } else {
        const u = await loginWithEmail(email, password);
        setAccount({
          uid: u.uid,
          displayName: u.displayName || u.email?.split('@')[0] || 'Maker Pro',
          email: u.email || email,
          mode: 'firebase',
          plan,
        });
        return;
      }
    }

    // Per-user isolated account registry
    const rawUsers = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS);
    const users: StoredLocalUser[] = rawUsers ? JSON.parse(rawUsers) : [];
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (mode === 'register') {
      if (existing) {
        throw new Error(
          'Este e-mail já está cadastrado. Mude para a aba "Entrar na Conta".'
        );
      }
      const safeUid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const newUser: StoredLocalUser = {
        uid: safeUid,
        displayName: name || email.split('@')[0],
        email,
        password,
        plan,
      };
      localStorage.setItem(
        STORAGE_KEYS.LOCAL_USERS,
        JSON.stringify([...users, newUser])
      );
      setAccount({
        uid: newUser.uid,
        displayName: newUser.displayName,
        email: newUser.email,
        mode: 'local_account',
        plan,
      });
    } else {
      if (existing && existing.password !== password) {
        throw new Error('Senha incorreta para este e-mail.');
      }
      const targetUid =
        existing?.uid || `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const targetName = existing?.displayName || email.split('@')[0];
      setAccount({
        uid: targetUid,
        displayName: targetName,
        email,
        mode: 'local_account',
        plan: existing?.plan || plan,
      });
    }
  };

  const handleLogout = async () => {
    try {
      if (fbUser) {
        await signOutUser();
      }
    } finally {
      setAccount(null);
      setPublicScreen('landing');
      setActiveScreen('calculator');
    }
  };

  // Gate: Show Landing Page as initial page when not logged in; switch to AuthView when user clicks Entrar / Planos
  if (!account) {
    if (publicScreen === 'landing') {
      return (
        <LandingPageView
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onOpenAuth={(options) => {
            setAuthInitialMode(options?.initialMode || 'login');
            if (options?.selectedPlan) {
              setAuthSelectedPlan(options.selectedPlan);
            }
            setPublicScreen('auth');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      );
    }

    return (
      <AuthView
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onLoginSuccess={(acc) => setAccount(acc)}
        onGoogleLogin={handleGoogleLogin}
        onEmailAuth={handleEmailAuth}
        externalError={authError}
        initialMode={authInitialMode}
        initialPlan={authSelectedPlan}
        onBackToLanding={() => {
          setPublicScreen('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  const totalCashBalance = transactions.reduce(
    (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
    0
  );

  const navItems: {
    id: ActiveScreen;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'calculator',
      label: 'Calculadora de Preço',
      shortLabel: 'Calculadora',
      icon: Calculator,
    },
    {
      id: 'products',
      label: `Produtos & Categorias (${products.length})`,
      shortLabel: 'Produtos',
      icon: Tags,
    },
    {
      id: 'orders',
      label: `Orçamentos & Pedidos (${quotes.length})`,
      shortLabel: 'Orçamentos',
      icon: FolderKanban,
    },
    {
      id: 'cashflow',
      label: 'Fluxo de Caixa',
      shortLabel: 'Caixa',
      icon: Wallet,
    },
    {
      id: 'inventory',
      label: `Estoque de Bobinas (${spools.length})`,
      shortLabel: 'Estoque',
      icon: Disc,
    },
    {
      id: 'reports',
      label: 'Dashboard & Relatórios',
      shortLabel: 'Dashboard',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-[#EEF0F4] dark:bg-[#0B0D13] text-slate-900 dark:text-slate-100 pb-20 lg:pb-0 transition-colors">
      <div className="mx-auto flex min-h-screen max-w-[1520px] flex-col lg:flex-row">
        {/* DESKTOP LEFT SIDEBAR (Hidden on Mobile, replaced by compact header + bottom nav bar) */}
        <aside className="hidden lg:flex lg:w-[276px] lg:shrink-0 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#11131A] p-6">
          <div>
            {/* Brand Wordmark */}
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 grid-cols-2 gap-0.5 rounded-xl bg-[#1D63FF] p-2 text-white shadow-md shadow-blue-600/25">
                <span className="rounded-full bg-white" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-full bg-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
                PrintMais
              </span>
            </div>

            {/* Welcome Block */}
            <div className="mt-7">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                Bem-vindo,{' '}
                <span className="block text-[#1D63FF]">
                  {account.displayName.split(' ')[0]}!
                </span>
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {account.email}
              </p>
            </div>

            {/* Sidebar Navigation (6 Separated Pages) */}
            <nav aria-label="Menu Principal Lateral" className="mt-7 space-y-1.5">
              <div className="pb-1 text-[11px] font-bold tracking-wider text-slate-400">
                PÁGINAS DO SISTEMA
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveScreen(item.id)}
                    className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Summary */}
            <div className="mt-8">
              <div className="pb-2 text-[11px] font-bold tracking-wider text-slate-400">
                RESUMO DA SUA CONTA
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#161923] px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Saldo Caixa
                  </span>
                  <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyBRL(totalCashBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#161923] px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Meus Produtos / Vendas
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[#1D63FF] dark:text-blue-400">
                    {products.length} prod · {sales.length} vendas
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#161923] px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Bobinas Ativas
                  </span>
                  <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                    {spools.length} un
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#161923] px-3.5 py-2.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Plano da Conta
                  </span>
                  <span className="font-mono font-bold text-[#1D63FF] dark:text-blue-400">
                    {PRINTMAIS_PLANS.find((p) => p.id === (account.plan || 'pro_annual'))
                      ?.name || 'Plano Pro Anual'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Callout Card (Black in Light Mode, Blue in Dark Mode) */}
          <div className="mt-6 rounded-3xl bg-[#0D0F14] dark:bg-[#1D63FF] p-5 text-white shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1D63FF]">
              <Box className="h-4 w-4" />
            </div>
            <div className="mt-3 text-base font-extrabold leading-snug">
              Precificação 3D Profissional
            </div>
            <p className="mt-1 text-xs text-slate-300 dark:text-blue-100">
              Cálculo exato de depreciação, kWh, falha e ROI da máquina.
            </p>
            <button
              type="button"
              onClick={() => {
                const lotePreset = CALCULATOR_PRESETS.find(
                  (p) => p.id === 'lote_producao'
                );
                if (lotePreset) {
                  setCalcParams((prev) => ({ ...prev, ...lotePreset.params }));
                }
                setActiveScreen('calculator');
              }}
              className="mt-4 inline-flex w-full items-center justify-between rounded-full bg-[#1D63FF] dark:bg-[#0D0F14] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              <span>Simular Lote 50 un</span>
              <span>↗</span>
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex flex-1 flex-col">
          {/* TOP HEADER BAR (Compact on Mobile, Full Segmented Pills on Desktop) */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/95 dark:bg-[#11131A]/95 backdrop-blur-md px-4 py-3 lg:px-6 lg:py-4">
            {/* Mobile Brand + Active Page Title */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-xl bg-[#1D63FF] p-1.5 text-white">
                <span className="rounded-full bg-white" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-sm bg-white/70" />
                <span className="rounded-full bg-white" />
              </div>
              <div>
                <div className="text-sm font-extrabold leading-none text-slate-900 dark:text-white">
                  PrintMais
                </div>
                <div className="text-[11px] font-medium text-[#1D63FF]">
                  {navItems.find((n) => n.id === activeScreen)?.shortLabel}
                </div>
              </div>
            </div>

            {/* Desktop Segmented Pill Navigation */}
            <div className="hidden lg:flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreen(item.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    activeScreen === item.id
                      ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#181C26] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>

            {/* Right Controls: PWA Install, Theme Toggle, Mobile Menu Drawer & User Account / Logout */}
            <div className="flex items-center gap-2">
              <PWAInstallButton variant="header" />

              <button
                type="button"
                onClick={() => setIsDark(!isDark)}
                aria-label={
                  isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'
                }
                className="inline-flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#181C26] text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>

              {/* Mobile Drawer Trigger Button in Header */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                aria-label="Abrir menu lateral mobile"
                title="Abrir menu lateral"
                className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#181C26] text-slate-700 dark:text-slate-200 hover:border-[#1D63FF] transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#181C26] pl-3 pr-1.5 py-1">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {account.displayName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {account.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(true)}
                  aria-label="Sair da conta"
                  title="Sair da conta"
                  className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Sair</span>
                </button>
              </div>
            </div>
          </header>

          {/* MAIN WORKSPACE CONTENT */}
          <main className="flex-1 p-4 sm:p-6 lg:p-7">
            {activeScreen === 'calculator' && (
              <CalculatorView
                params={calcParams}
                onChangeParams={setCalcParams}
                spools={spools}
                products={products}
                categories={categories}
                onCreateCategory={handleCreateCategory}
                onDeleteCategory={handleDeleteCategory}
                sales={sales}
                onCreateProduct={handleCreateProduct}
                onDeleteProduct={handleDeleteProduct}
                onRegisterSale={handleRegisterSale}
                onDeleteSale={handleDeleteSale}
                onNavigateToCashflow={() => setActiveScreen('cashflow')}
              />
            )}

            {activeScreen === 'products' && (
              <ProductsCatalogView
                products={products}
                categories={categories}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onCreateCategory={handleCreateCategory}
                onDeleteCategory={handleDeleteCategory}
                onNavigateToOrdersWithProduct={() => setActiveScreen('orders')}
              />
            )}

            {activeScreen === 'orders' && (
              <OrdersView
                quotes={quotes}
                products={products}
                spools={spools}
                categories={categories}
                onCreateQuote={handleCreateQuote}
                onUpdateQuote={handleUpdateQuote}
                onApproveQuote={handleApproveQuote}
                onConvertQuoteToOrder={handleConvertQuoteToOrder}
                onDeleteQuote={handleDeleteQuote}
                onNavigateToCalculator={() => setActiveScreen('calculator')}
                onNavigateToProducts={() => setActiveScreen('products')}
                onNavigateToCashflow={() => setActiveScreen('cashflow')}
              />
            )}

            {activeScreen === 'cashflow' && (
              <CashFlowView
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigateToCalculator={() => setActiveScreen('calculator')}
              />
            )}

            {activeScreen === 'inventory' && (
              <InventoryView
                spools={spools}
                onAddSpool={handleAddSpool}
                onUpdateSpool={handleUpdateSpool}
                onUpdateSpoolWeight={handleUpdateSpoolWeight}
                onDeleteSpool={handleDeleteSpool}
              />
            )}

            {activeScreen === 'reports' && (
              <ReportsDashboardView
                quotes={quotes}
                transactions={transactions}
                spools={spools}
                onNavigateToCalculator={() => setActiveScreen('calculator')}
                onNavigateToCashflow={() => setActiveScreen('cashflow')}
                onNavigateToOrders={() => setActiveScreen('orders')}
                onNavigateToInventory={() => setActiveScreen('inventory')}
              />
            )}
          </main>
        </div>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (lg:hidden) — 5 Well-Spaced Touch Targets */}
      <nav
        aria-label="Menu Inferior Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 items-center border-t border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#11131A]/95 px-1 backdrop-blur-md lg:hidden"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'text-[#1D63FF] dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1 text-[10px] tracking-tight whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* 5th Button: Opens Mobile Side Drawer Menu */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          data-testid="bottom-nav-menu-btn"
          aria-label="Abrir menu lateral completo"
          className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl transition-colors relative ${
            isMobileDrawerOpen || activeScreen === 'inventory' || activeScreen === 'reports'
              ? 'text-[#1D63FF] dark:text-blue-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Menu className="h-5 w-5" />
            {(activeScreen === 'inventory' || activeScreen === 'reports') && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#1D63FF]" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight whitespace-nowrap">
            Menu
          </span>
        </button>
      </nav>

      {/* MOBILE DRAWER SIDE MENU */}
      <MobileDrawerMenu
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          setIsMobileDrawerOpen(false);
        }}
        account={account}
        totalCashBalance={totalCashBalance}
        productsCount={products.length}
        spoolsCount={spools.length}
        quotesCount={quotes.length}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onRequestLogout={() => setIsLogoutModalOpen(true)}
        onSimulateLot={() => {
          const lotePreset = CALCULATOR_PRESETS.find(
            (p) => p.id === 'lote_producao'
          );
          if (lotePreset) {
            setCalcParams((prev) => ({ ...prev, ...lotePreset.params }));
          }
          setActiveScreen('calculator');
        }}
      />

      {/* CONFIRM LOGOUT MODAL */}
      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        account={account}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await handleLogout();
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* PWA OFFLINE INDICATOR */}
      <OfflineIndicator />
    </div>
  );
}
