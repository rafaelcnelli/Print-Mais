import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BLUEPRINT_CONSTRAINTS,
  ExtraSupplyRecord,
  ProductRecord,
  QuoteRecord,
  SaleRecord,
  SpoolRecord,
  TransactionRecord,
} from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot as required by firebase-integration-rpc
export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function registerWithEmail(name: string, email: string, pass: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  return cred.user;
}

export async function loginWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function signOutUser() {
  return fbSignOut(auth);
}

function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, BLUEPRINT_CONSTRAINTS.MAX_ID_LEN);
  return cleaned || `id_${Date.now()}`;
}

function clampString(val: string, maxLen: number, fallback = 'Item'): string {
  const trimmed = (val || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function saveQuoteToFirestore(quote: QuoteRecord): Promise<void> {
  const safeId = sanitizeId(quote.id);
  const path = `quotes/${safeId}`;
  try {
    await setDoc(doc(db, 'quotes', safeId), {
      ownerId: quote.ownerId,
      clientName: clampString(quote.clientName, BLUEPRINT_CONSTRAINTS.MAX_CLIENT_NAME, 'Cliente'),
      projectName: clampString(quote.projectName, BLUEPRINT_CONSTRAINTS.MAX_PROJECT_NAME, 'Peça 3D'),
      technology: quote.technology === 'SLA_Resina' ? 'SLA_Resina' : 'FDM',
      presetId: clampString(quote.presetId, BLUEPRINT_CONSTRAINTS.MAX_PRESET_ID, 'custom'),
      weightGrams: Math.max(0, Math.min(1000000, Number(quote.weightGrams) || 0)),
      filamentPricePerKg: Math.max(0, Math.min(100000, Number(quote.filamentPricePerKg) || 0)),
      printTimeHours: Math.max(0, Math.min(10000, Number(quote.printTimeHours) || 0)),
      printTimeMinutes: Math.max(0, Math.min(59, Number(quote.printTimeMinutes) || 0)),
      printerPowerWatts: Math.max(0, Math.min(50000, Number(quote.printerPowerWatts) || 0)),
      energyRateKwh: Math.max(0, Math.min(1000, Number(quote.energyRateKwh) || 0)),
      printerCost: Math.max(0, Math.min(10000000, Number(quote.printerCost) || 0)),
      printerLifespanHours: Math.max(1, Math.min(1000000, Number(quote.printerLifespanHours) || 1)),
      laborHourlyRate: Math.max(0, Math.min(100000, Number(quote.laborHourlyRate) || 0)),
      laborHours: Math.max(0, Math.min(10000, Number(quote.laborHours) || 0)),
      batchQuantity: Math.max(1, Math.min(1000000, Math.round(Number(quote.batchQuantity) || 1))),
      profitMarginPercent: Math.max(0, Math.min(5000, Number(quote.profitMarginPercent) || 0)),
      failureRiskPercent: Math.max(0, Math.min(1000, Number(quote.failureRiskPercent) || 0)),
      unitCost: Math.max(0, Number(quote.unitCost) || 0),
      unitPrice: Math.max(0, Number(quote.unitPrice) || 0),
      totalPrice: Math.max(0, Number(quote.totalPrice) || 0),
      netProfit: Number(quote.netProfit) || 0,
      status: quote.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuoteStatusInFirestore(
  quoteId: string,
  status: 'draft' | 'approved' | 'completed'
): Promise<void> {
  const safeId = sanitizeId(quoteId);
  const path = `quotes/${safeId}`;
  try {
    await updateDoc(doc(db, 'quotes', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateQuoteInFirestore(quote: QuoteRecord): Promise<void> {
  const safeId = sanitizeId(quote.id);
  const path = `quotes/${safeId}`;
  try {
    await updateDoc(doc(db, 'quotes', safeId), {
      clientName: clampString(quote.clientName, BLUEPRINT_CONSTRAINTS.MAX_CLIENT_NAME, 'Cliente'),
      projectName: clampString(quote.projectName, BLUEPRINT_CONSTRAINTS.MAX_PROJECT_NAME, 'Peça 3D'),
      technology: quote.technology === 'SLA_Resina' ? 'SLA_Resina' : 'FDM',
      presetId: clampString(quote.presetId, BLUEPRINT_CONSTRAINTS.MAX_PRESET_ID, 'custom'),
      weightGrams: Math.max(0, Math.min(1000000, Number(quote.weightGrams) || 0)),
      filamentPricePerKg: Math.max(0, Math.min(100000, Number(quote.filamentPricePerKg) || 0)),
      printTimeHours: Math.max(0, Math.min(10000, Number(quote.printTimeHours) || 0)),
      printTimeMinutes: Math.max(0, Math.min(59, Number(quote.printTimeMinutes) || 0)),
      printerPowerWatts: Math.max(0, Math.min(50000, Number(quote.printerPowerWatts) || 0)),
      energyRateKwh: Math.max(0, Math.min(1000, Number(quote.energyRateKwh) || 0)),
      printerCost: Math.max(0, Math.min(10000000, Number(quote.printerCost) || 0)),
      printerLifespanHours: Math.max(1, Math.min(1000000, Number(quote.printerLifespanHours) || 1)),
      laborHourlyRate: Math.max(0, Math.min(100000, Number(quote.laborHourlyRate) || 0)),
      laborHours: Math.max(0, Math.min(10000, Number(quote.laborHours) || 0)),
      batchQuantity: Math.max(1, Math.min(1000000, Math.round(Number(quote.batchQuantity) || 1))),
      profitMarginPercent: Math.max(0, Math.min(5000, Number(quote.profitMarginPercent) || 0)),
      failureRiskPercent: Math.max(0, Math.min(1000, Number(quote.failureRiskPercent) || 0)),
      unitCost: Math.max(0, Number(quote.unitCost) || 0),
      unitPrice: Math.max(0, Number(quote.unitPrice) || 0),
      totalPrice: Math.max(0, Number(quote.totalPrice) || 0),
      netProfit: Number(quote.netProfit) || 0,
      status: quote.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuoteFromFirestore(quoteId: string): Promise<void> {
  const safeId = sanitizeId(quoteId);
  const path = `quotes/${safeId}`;
  try {
    await deleteDoc(doc(db, 'quotes', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTransactionToFirestore(tx: TransactionRecord): Promise<void> {
  const safeId = sanitizeId(tx.id);
  const path = `transactions/${safeId}`;
  try {
    await setDoc(doc(db, 'transactions', safeId), {
      ownerId: tx.ownerId,
      title: clampString(tx.title, BLUEPRINT_CONSTRAINTS.MAX_TX_TITLE, 'Lançamento'),
      type: tx.type === 'expense' ? 'expense' : 'income',
      category: tx.category,
      amount: Math.max(0, Math.min(100000000, Number(tx.amount) || 0)),
      dateIso: clampString(tx.dateIso, 25, new Date().toISOString().slice(0, 10)),
      notes: (tx.notes || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_TX_NOTES),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTransactionInFirestore(tx: TransactionRecord): Promise<void> {
  const safeId = sanitizeId(tx.id);
  const path = `transactions/${safeId}`;
  try {
    await updateDoc(doc(db, 'transactions', safeId), {
      title: clampString(tx.title, BLUEPRINT_CONSTRAINTS.MAX_TX_TITLE, 'Lançamento'),
      type: tx.type === 'expense' ? 'expense' : 'income',
      category: tx.category,
      amount: Math.max(0, Math.min(100000000, Number(tx.amount) || 0)),
      dateIso: clampString(tx.dateIso, 25, new Date().toISOString().slice(0, 10)),
      notes: (tx.notes || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_TX_NOTES),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTransactionFromFirestore(txId: string): Promise<void> {
  const safeId = sanitizeId(txId);
  const path = `transactions/${safeId}`;
  try {
    await deleteDoc(doc(db, 'transactions', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSpoolToFirestore(spool: SpoolRecord): Promise<void> {
  const safeId = sanitizeId(spool.id);
  const path = `spools/${safeId}`;
  const initialW = Math.max(1, Math.min(50000, Number(spool.initialWeightGrams) || 1000));
  const remainingW = Math.max(0, Math.min(initialW, Number(spool.remainingWeightGrams) || 0));
  const validHex = BLUEPRINT_CONSTRAINTS.HEX_PATTERN.test(spool.colorHex)
    ? spool.colorHex
    : '#1D63FF';

  try {
    await setDoc(doc(db, 'spools', safeId), {
      ownerId: spool.ownerId,
      name: clampString(spool.name, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_NAME, 'Bobina PLA'),
      brand: clampString(spool.brand, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_BRAND, 'Voolt3D'),
      materialType: spool.materialType,
      colorName: clampString(spool.colorName, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_COLOR_NAME, 'Azul'),
      colorHex: validHex,
      initialWeightGrams: initialW,
      remainingWeightGrams: remainingW,
      pricePaid: Math.max(0, Math.min(100000, Number(spool.pricePaid) || 0)),
      minAlertGrams: Math.max(0, Math.min(50000, Number(spool.minAlertGrams) || 200)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSpoolInFirestore(spool: SpoolRecord): Promise<void> {
  const safeId = sanitizeId(spool.id);
  const path = `spools/${safeId}`;
  const initialW = Math.max(1, Math.min(50000, Number(spool.initialWeightGrams) || 1000));
  const remainingW = Math.max(0, Math.min(initialW, Number(spool.remainingWeightGrams) || 0));
  const validHex = BLUEPRINT_CONSTRAINTS.HEX_PATTERN.test(spool.colorHex)
    ? spool.colorHex
    : '#1D63FF';

  try {
    await updateDoc(doc(db, 'spools', safeId), {
      name: clampString(spool.name, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_NAME, 'Bobina PLA'),
      brand: clampString(spool.brand, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_BRAND, 'Voolt3D'),
      materialType: spool.materialType,
      colorName: clampString(spool.colorName, BLUEPRINT_CONSTRAINTS.MAX_SPOOL_COLOR_NAME, 'Azul'),
      colorHex: validHex,
      initialWeightGrams: initialW,
      remainingWeightGrams: remainingW,
      pricePaid: Math.max(0, Math.min(100000, Number(spool.pricePaid) || 0)),
      minAlertGrams: Math.max(0, Math.min(50000, Number(spool.minAlertGrams) || 200)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSpoolWeightInFirestore(
  spoolId: string,
  remainingWeightGrams: number
): Promise<void> {
  const safeId = sanitizeId(spoolId);
  const path = `spools/${safeId}`;
  try {
    await updateDoc(doc(db, 'spools', safeId), {
      remainingWeightGrams: Math.max(0, Math.min(50000, Number(remainingWeightGrams) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSpoolFromFirestore(spoolId: string): Promise<void> {
  const safeId = sanitizeId(spoolId);
  const path = `spools/${safeId}`;
  try {
    await deleteDoc(doc(db, 'spools', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveProductToFirestore(product: ProductRecord): Promise<void> {
  const safeId = sanitizeId(product.id);
  const path = `products/${safeId}`;
  try {
    await setDoc(doc(db, 'products', safeId), {
      ownerId: product.ownerId,
      name: clampString(product.name, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_NAME, 'Produto 3D'),
      sku: clampString(product.sku, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_SKU, 'SKU-001'),
      category: clampString(product.category, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_CATEGORY, 'Peça Técnica'),
      technology: product.technology === 'SLA_Resina' ? 'SLA_Resina' : 'FDM',
      weightGrams: Math.max(0, Math.min(1000000, Number(product.weightGrams) || 0)),
      printTimeHours: Math.max(0, Math.min(10000, Number(product.printTimeHours) || 0)),
      printTimeMinutes: Math.max(0, Math.min(59, Number(product.printTimeMinutes) || 0)),
      filamentPricePerKg: Math.max(0, Math.min(100000, Number(product.filamentPricePerKg) || 0)),
      unitCost: Math.max(0, Math.min(10000000, Number(product.unitCost) || 0)),
      unitPrice: Math.max(0, Math.min(10000000, Number(product.unitPrice) || 0)),
      profitMarginPercent: Math.max(0, Math.min(5000, Number(product.profitMarginPercent) || 0)),
      stockQuantity: Math.max(0, Math.min(1000000, Math.round(Number(product.stockQuantity) || 0))),
      description: (product.description || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_DESC),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProductStockInFirestore(
  productId: string,
  stockQuantity: number
): Promise<void> {
  const safeId = sanitizeId(productId);
  const path = `products/${safeId}`;
  try {
    await updateDoc(doc(db, 'products', safeId), {
      stockQuantity: Math.max(0, Math.min(1000000, Math.round(Number(stockQuantity) || 0))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateProductInFirestore(product: ProductRecord): Promise<void> {
  const safeId = sanitizeId(product.id);
  const path = `products/${safeId}`;
  try {
    await updateDoc(doc(db, 'products', safeId), {
      name: clampString(product.name, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_NAME, 'Produto 3D'),
      sku: clampString(product.sku, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_SKU, 'SKU-001'),
      category: clampString(product.category, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_CATEGORY, 'Peça Técnica'),
      technology: product.technology === 'SLA_Resina' ? 'SLA_Resina' : 'FDM',
      weightGrams: Math.max(0, Math.min(1000000, Number(product.weightGrams) || 0)),
      printTimeHours: Math.max(0, Math.min(10000, Number(product.printTimeHours) || 0)),
      printTimeMinutes: Math.max(0, Math.min(59, Number(product.printTimeMinutes) || 0)),
      filamentPricePerKg: Math.max(0, Math.min(100000, Number(product.filamentPricePerKg) || 0)),
      unitCost: Math.max(0, Math.min(10000000, Number(product.unitCost) || 0)),
      unitPrice: Math.max(0, Math.min(10000000, Number(product.unitPrice) || 0)),
      profitMarginPercent: Math.max(0, Math.min(5000, Number(product.profitMarginPercent) || 0)),
      stockQuantity: Math.max(0, Math.min(1000000, Math.round(Number(product.stockQuantity) || 0))),
      description: (product.description || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_PRODUCT_DESC),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const safeId = sanitizeId(productId);
  const path = `products/${safeId}`;
  try {
    await deleteDoc(doc(db, 'products', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSaleToFirestore(sale: SaleRecord): Promise<void> {
  const safeId = sanitizeId(sale.id);
  const path = `sales/${safeId}`;
  const safeTxId = sanitizeId(sale.transactionId || `tx_${Date.now()}`);
  try {
    await setDoc(doc(db, 'sales', safeId), {
      ownerId: sale.ownerId,
      clientName: clampString(sale.clientName, BLUEPRINT_CONSTRAINTS.MAX_CLIENT_NAME, 'Cliente'),
      clientContact: (sale.clientContact || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_CLIENT_CONTACT),
      saleDate: clampString(sale.saleDate, 25, new Date().toISOString().slice(0, 10)),
      saleTime: clampString(sale.saleTime, 10, '14:00'),
      paymentMethod: sale.paymentMethod,
      salesChannel: sale.salesChannel,
      productName: clampString(sale.productName, BLUEPRINT_CONSTRAINTS.MAX_SALE_PRODUCT_SUMMARY, 'Produto 3D'),
      itemsSummary: clampString(sale.itemsSummary, BLUEPRINT_CONSTRAINTS.MAX_SALE_ITEMS_SUMMARY, '1x Produto 3D'),
      totalQuantity: Math.max(1, Math.min(1000000, Math.round(Number(sale.totalQuantity) || 1))),
      subtotalAmount: Math.max(0, Math.min(100000000, Number(sale.subtotalAmount) || 0)),
      discountAmount: Math.max(0, Math.min(100000000, Number(sale.discountAmount) || 0)),
      shippingAmount: Math.max(0, Math.min(100000000, Number(sale.shippingAmount) || 0)),
      totalAmount: Math.max(0, Math.min(100000000, Number(sale.totalAmount) || 0)),
      totalCost: Math.max(0, Math.min(100000000, Number(sale.totalCost) || 0)),
      netProfit: Number(sale.netProfit) || 0,
      totalWeightGrams: Math.max(0, Math.min(10000000, Number(sale.totalWeightGrams) || 0)),
      transactionId: safeTxId,
      notes: (sale.notes || '').trim().slice(0, BLUEPRINT_CONSTRAINTS.MAX_SALE_NOTES),
      status: sale.status === 'pendente' ? 'pendente' : 'concluida',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSaleFromFirestore(saleId: string): Promise<void> {
  const safeId = sanitizeId(saleId);
  const path = `sales/${safeId}`;
  try {
    await deleteDoc(doc(db, 'sales', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveExtraSupplyToFirestore(supply: ExtraSupplyRecord): Promise<void> {
  const safeId = sanitizeId(supply.id);
  const path = `extra_supplies/${safeId}`;
  try {
    await setDoc(doc(db, 'extra_supplies', safeId), {
      ownerId: supply.ownerId,
      nome: clampString(supply.nome || supply.name || 'Insumo Extra', 120, 'Insumo Extra'),
      name: clampString(supply.nome || supply.name || 'Insumo Extra', 120, 'Insumo Extra'),
      categoria: supply.categoria || supply.category || 'Ferragens',
      category: supply.categoria || supply.category || 'Ferragens',
      precoCompraPacote: Math.max(0, Number(supply.precoCompraPacote) || 0),
      quantidadeNoPacote: Math.max(1, Math.round(Number(supply.quantidadeNoPacote) || 1)),
      custoUnitario: Math.max(0, Number(supply.custoUnitario) || 0),
      estoqueAtual: Math.max(0, Math.round(Number(supply.estoqueAtual) || 0)),
      estoqueMinimo: Math.max(0, Math.round(Number(supply.estoqueMinimo) || 0)),
      unit: supply.unidadeMedida || supply.unit || 'un',
      notes: (supply.observacoes || supply.notes || '').trim().slice(0, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExtraSupplyInFirestore(supply: ExtraSupplyRecord): Promise<void> {
  const safeId = sanitizeId(supply.id);
  const path = `extra_supplies/${safeId}`;
  try {
    await updateDoc(doc(db, 'extra_supplies', safeId), {
      nome: clampString(supply.nome || supply.name || 'Insumo Extra', 120, 'Insumo Extra'),
      name: clampString(supply.nome || supply.name || 'Insumo Extra', 120, 'Insumo Extra'),
      categoria: supply.categoria || supply.category || 'Ferragens',
      category: supply.categoria || supply.category || 'Ferragens',
      precoCompraPacote: Math.max(0, Number(supply.precoCompraPacote) || 0),
      quantidadeNoPacote: Math.max(1, Math.round(Number(supply.quantidadeNoPacote) || 1)),
      custoUnitario: Math.max(0, Number(supply.custoUnitario) || 0),
      estoqueAtual: Math.max(0, Math.round(Number(supply.estoqueAtual) || 0)),
      estoqueMinimo: Math.max(0, Math.round(Number(supply.estoqueMinimo) || 0)),
      unit: supply.unidadeMedida || supply.unit || 'un',
      notes: (supply.observacoes || supply.notes || '').trim().slice(0, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateExtraSupplyStockInFirestore(
  supplyId: string,
  estoqueAtual: number
): Promise<void> {
  const safeId = sanitizeId(supplyId);
  const path = `extra_supplies/${safeId}`;
  try {
    await updateDoc(doc(db, 'extra_supplies', safeId), {
      estoqueAtual: Math.max(0, Math.round(Number(estoqueAtual) || 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExtraSupplyFromFirestore(supplyId: string): Promise<void> {
  const safeId = sanitizeId(supplyId);
  const path = `extra_supplies/${safeId}`;
  try {
    await deleteDoc(doc(db, 'extra_supplies', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Process uploaded 3D printing project file (.stl, .3mf, .gcode, .obj, .zip).
 * Returns base64 DataURL (works offline & online), human formatted size (e.g. 4.2 MB) and detected format.
 */
export async function process3DFile(file: File): Promise<{
  arquivo3dUrl: string;
  arquivo3dNome: string;
  arquivo3dTamanho: string;
  arquivo3dFormato: string;
}> {
  return new Promise((resolve, reject) => {
    const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
    const formato = extMatch ? `.${extMatch[1].toLowerCase()}` : '.stl';

    // Format file size
    const bytes = file.size;
    let tamanhoFormatted = `${bytes} B`;
    if (bytes >= 1024 * 1024) {
      tamanhoFormatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      tamanhoFormatted = `${(bytes / 1024).toFixed(0)} KB`;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        arquivo3dUrl: reader.result as string,
        arquivo3dNome: file.name,
        arquivo3dTamanho: tamanhoFormatted,
        arquivo3dFormato: formato,
      });
    };
    reader.onerror = () => {
      reject(new Error('Falha ao processar arquivo 3D'));
    };
    reader.readAsDataURL(file);
  });
}


