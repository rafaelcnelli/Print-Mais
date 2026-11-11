export type PrintTechnology = 'FDM' | 'SLA_Resina';

export type QuoteStatus = 'draft' | 'approved' | 'completed';

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'venda_direta'
  | 'encomenda_lote'
  | 'prototipagem'
  | 'filamento_resina'
  | 'pecas_reposicao'
  | 'energia'
  | 'manutencao'
  | 'outros';

export type MaterialType =
  | 'PLA'
  | 'PETG'
  | 'ABS'
  | 'ASA'
  | 'TPU'
  | 'Resina_Standard'
  | 'Resina_ABS_Like';

export type PaymentMethod =
  | 'PIX'
  | 'Cartao_Credito'
  | 'Cartao_Debito'
  | 'Dinheiro'
  | 'Boleto'
  | 'Transferencia';

export type SalesChannel =
  | 'WhatsApp'
  | 'Instagram'
  | 'Mercado_Livre'
  | 'Shopee'
  | 'Loja_Propria'
  | 'Balcao';

export interface CalculatorParams {
  clientName: string;
  projectName: string;
  technology: PrintTechnology;
  presetId: string;
  // Material e Tempo
  weightGrams: number;
  filamentPricePerKg: number;
  printTimeHours: number;
  printTimeMinutes: number;
  printerPowerWatts: number;
  // Operação e Desgaste
  energyRateKwh: number;
  printerCost: number;
  printerLifespanHours: number;
  // Mão de Obra e Setup
  laborHourlyRate: number;
  laborHours: number;
  batchQuantity: number;
  // Margens e Riscos
  profitMarginPercent: number;
  failureRiskPercent: number;
}

export interface CostBreakdownResult {
  printHoursDecimal: number;
  totalBatchHours: number;
  materialCostUnit: number;
  energyCostUnit: number;
  depreciationCostUnit: number;
  laborCostUnit: number;
  baseSubtotalUnit: number;
  failureRiskCostUnit: number;
  unitCost: number;
  unitProfit: number;
  unitPrice: number;
  // Totals for batch
  materialCostBatch: number;
  energyCostBatch: number;
  depreciationCostBatch: number;
  laborCostBatch: number;
  failureRiskCostBatch: number;
  totalBatchCost: number;
  totalBatchProfit: number;
  totalBatchPrice: number;
  // Comparisons & ROI
  naiveWeightOnlyUnitPrice: number;
  hiddenCostDifferenceUnit: number;
  hiddenCostDifferenceBatch: number;
  unitsToPayPrinter: number;
  batchesToPayPrinter: number;
  costSharePercent: number;
  profitSharePercent: number;
}

export interface QuoteRecord extends CalculatorParams {
  id: string;
  ownerId: string;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  netProfit: number;
  status: QuoteStatus;
  createdAtIso: string;
  // Product-based Quote fields
  items?: SaleItemRecord[];
  itemsSummary?: string;
  clientContact?: string;
  discountAmount?: number;
  shippingAmount?: number;
  validDays?: number;
  deliveryDays?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface TransactionRecord {
  id: string;
  ownerId: string;
  title: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  dateIso: string;
  notes: string;
  createdAtIso: string;
  // Optional client-side metadata for richer Cash Flow display
  saleId?: string;
  saleTime?: string;
  clientName?: string;
  paymentMethod?: PaymentMethod;
  salesChannel?: SalesChannel;
}

export interface SpoolRecord {
  id: string;
  ownerId: string;
  name: string;
  brand: string;
  materialType: MaterialType;
  colorName: string;
  colorHex: string;
  initialWeightGrams: number;
  remainingWeightGrams: number;
  pricePaid: number;
  minAlertGrams: number;
  createdAtIso: string;
}

export interface ProductCategoryRecord {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  colorHex: string;
  createdAtIso: string;
}

export interface ProductRecord {
  id: string;
  ownerId: string;
  name: string;
  sku: string;
  category: string;
  technology: PrintTechnology;
  weightGrams: number;
  printTimeHours: number;
  printTimeMinutes: number;
  filamentPricePerKg: number;
  unitCost: number;
  unitPrice: number;
  profitMarginPercent: number;
  stockQuantity: number;
  description: string;
  imageUrl?: string;
  paramsSnapshot?: CalculatorParams;
  createdAtIso: string;
}

export interface SaleItemRecord {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  weightGrams: number;
  imageUrl?: string;
}

export interface SaleRecord {
  id: string;
  ownerId: string;
  clientName: string;
  clientContact: string;
  saleDate: string; // YYYY-MM-DD
  saleTime: string; // HH:mm
  paymentMethod: PaymentMethod;
  salesChannel: SalesChannel;
  productName: string;
  itemsSummary: string;
  items: SaleItemRecord[];
  totalQuantity: number;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  totalCost: number;
  netProfit: number;
  totalWeightGrams: number;
  transactionId: string;
  notes: string;
  status: 'concluida' | 'pendente';
  createdAtIso: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  params: Partial<CalculatorParams>;
}

export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  HEX_PATTERN: /^#[0-9a-fA-F]{3,8}$/,
  MAX_ID_LEN: 128,
  MAX_CLIENT_NAME: 120,
  MAX_CLIENT_CONTACT: 120,
  MAX_PROJECT_NAME: 150,
  MAX_PRODUCT_NAME: 150,
  MAX_PRODUCT_SKU: 40,
  MAX_PRODUCT_CATEGORY: 60,
  MAX_PRODUCT_DESC: 300,
  MAX_SALE_PRODUCT_SUMMARY: 200,
  MAX_SALE_ITEMS_SUMMARY: 400,
  MAX_SALE_NOTES: 300,
  MAX_PRESET_ID: 40,
  MAX_TX_TITLE: 160,
  MAX_TX_NOTES: 300,
  MAX_SPOOL_NAME: 120,
  MAX_SPOOL_BRAND: 80,
  MAX_SPOOL_COLOR_NAME: 60,
} as const;
