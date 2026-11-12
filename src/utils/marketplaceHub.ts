import {
  ImportedMarketplaceOrderRow,
  MarketplaceIntegrationsConfig,
  MarketplacePriceDetail,
  ProductRecord,
  SaleRecord,
  TransactionRecord,
} from '../types';
import { calculateMarketplaceGrossUp, formatCurrencyBRL } from './pricing';

export const DEFAULT_MARKETPLACE_INTEGRATIONS: MarketplaceIntegrationsConfig = {
  mercadoLivre: {
    status: 'spreadsheet_manual',
    appId: '',
    secretKey: '',
    accessToken: '',
    sellerId: '',
    nickname: 'Oficina3D_ML_Oficial',
    commissionPercent: 16,
    fixedFee: 6.0,
  },
  shopee: {
    status: 'spreadsheet_manual',
    partnerId: '',
    shopId: '',
    partnerKey: '',
    accessToken: '',
    shopName: 'PrintMais3D_Shopee',
    commissionPercent: 20,
    fixedFee: 4.0,
  },
};

/**
 * Obtém o preço ajustado (Gross-up) do produto para Mercado Livre ou Shopee,
 * preservando a margem de lucro líquida em reais da venda direta.
 */
export function getProductMarketplacePriceDetail(
  product: ProductRecord,
  platform: 'mercadoLivre' | 'shopee',
  integrations?: MarketplaceIntegrationsConfig
): MarketplacePriceDetail {
  const existing = product.marketplacePrices?.[platform];
  if (existing && typeof existing === 'object' && existing.listingPrice > 0) {
    return existing;
  }

  const mlComm = integrations?.mercadoLivre.commissionPercent ?? 16;
  const mlFixed = integrations?.mercadoLivre.fixedFee ?? 6.0;
  const shopeeComm = integrations?.shopee.commissionPercent ?? 20;
  const shopeeFixed = integrations?.shopee.fixedFee ?? 4.0;

  if (platform === 'mercadoLivre') {
    if (typeof existing === 'number' && existing > 0) {
      const feeAmount = Math.max(0, Math.round((existing - product.unitPrice) * 100) / 100);
      return {
        platform: 'mercadoLivre',
        platformName: 'Mercado Livre',
        commissionPercent: mlComm,
        fixedFee: mlFixed,
        listingPrice: existing,
        feeAmount,
        netReceived: product.unitPrice,
      };
    }
    return calculateMarketplaceGrossUp(
      product.unitPrice,
      mlComm,
      mlFixed,
      'mercadoLivre',
      'Mercado Livre'
    );
  }

  if (typeof existing === 'number' && existing > 0) {
    const feeAmount = Math.max(0, Math.round((existing - product.unitPrice) * 100) / 100);
    return {
      platform: 'shopee',
      platformName: 'Shopee',
      commissionPercent: shopeeComm,
      fixedFee: shopeeFixed,
      listingPrice: existing,
      feeAmount,
      netReceived: product.unitPrice,
    };
  }

  return calculateMarketplaceGrossUp(
    product.unitPrice,
    shopeeComm,
    shopeeFixed,
    'shopee',
    'Shopee'
  );
}

/**
 * Faz o vínculo automático de SKU ou nome do item importado com um Produto do Catálogo.
 */
export function findMatchingCatalogProduct(
  skuOrTitle: string,
  skuExplicit: string,
  products: ProductRecord[]
): ProductRecord | undefined {
  const cleanSku = (skuExplicit || '').trim().toUpperCase();
  if (cleanSku) {
    const byExactSku = products.find((p) => p.sku.trim().toUpperCase() === cleanSku);
    if (byExactSku) return byExactSku;
  }

  const cleanText = (skuOrTitle || '').trim().toUpperCase();
  if (!cleanText) return undefined;

  // Match if text contains product SKU
  const byEmbeddedSku = products.find(
    (p) => p.sku && cleanText.includes(p.sku.trim().toUpperCase())
  );
  if (byEmbeddedSku) return byEmbeddedSku;

  // Match by product name substring
  return products.find(
    (p) =>
      cleanText.includes(p.name.trim().toUpperCase()) ||
      p.name.trim().toUpperCase().includes(cleanText)
  );
}

/**
 * Gera o conteúdo da Planilha de Exemplo (.CSV) para teste imediato de importação de vendas
 * do Mercado Livre e da Shopee.
 */
export function generateSampleMarketplaceSalesCsv(products: ProductRecord[]): string {
  const p1 = products[0] || {
    sku: 'PRD-IP65',
    name: 'Gabinete Sensor Industrial IP65',
    unitPrice: 28.2,
  };
  const p2 = products[3] || products[1] || {
    sku: 'PRD-GAMER-01',
    name: 'Suporte Headset Gamer & Controle Mesa',
    unitPrice: 64.9,
  };
  const p3 = products[2] || {
    sku: 'PRD-ENG-08',
    name: 'Engrenagem Helicoidal Reposição Nylon/PETG',
    unitPrice: 102.78,
  };
  const p4 = products[1] || {
    sku: 'PRD-SLA-02',
    name: 'Busto Colecionável Malenia 22cm SLA',
    unitPrice: 345.95,
  };

  const headers = [
    'ID_Pedido',
    'Data',
    'Horario',
    'Canal',
    'SKU',
    'Produto',
    'Cliente',
    'Quantidade',
    'Valor_Bruto_BRL',
    'Taxa_Marketplace_Frete_BRL',
    'Valor_Liquido_BRL',
  ];

  const rows = [
    [
      'MLB-2049819201',
      '2026-11-10',
      '11:20',
      'Mercado Livre',
      p1.sku,
      p1.name,
      'Marcos Vinícius (ML)',
      '3',
      '122.13',
      '37.53',
      '84.60',
    ],
    [
      'SHP-261111884B',
      '2026-11-11',
      '15:45',
      'Shopee',
      p2.sku,
      p2.name,
      'Camila Rocha (Shopee)',
      '2',
      '172.26',
      '42.46',
      '129.80',
    ],
    [
      'MLB-2049954110',
      '2026-11-11',
      '18:05',
      'Mercado Livre',
      p3.sku,
      p3.name,
      'Oficina Mecânica Sul (ML)',
      '2',
      '258.95',
      '53.39',
      '205.56',
    ],
    [
      'SHP-261112990C',
      '2026-11-12',
      '09:30',
      'Shopee',
      p4.sku,
      p4.name,
      'Rafael Geek Collector (Shopee)',
      '1',
      '437.44',
      '91.49',
      '345.95',
    ],
  ];

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Gera vendas simuladas via API Oficial do Mercado Livre e/ou Shopee para sincronização em 1 clique.
 */
export function generateSimulatedApiOrders(
  products: ProductRecord[],
  channelFilter: 'all' | 'Mercado_Livre' | 'Shopee' = 'all'
): ImportedMarketplaceOrderRow[] {
  const csv = generateSampleMarketplaceSalesCsv(products);
  const parsed = parseMarketplaceOrdersContent(csv, 'api_sync.csv', products);
  if (channelFilter === 'all') return parsed;
  return parsed.filter((row) => row.channel === channelFilter);
}

/**
 * Faz o parse inteligente de arquivos .CSV ou .JSON exportados do Mercado Livre / Shopee
 * ou da planilha padrão do PrintMais.
 */
export function parseMarketplaceOrdersContent(
  content: string,
  filename: string,
  catalogProducts: ProductRecord[]
): ImportedMarketplaceOrderRow[] {
  const trimmed = (content || '').trim();
  if (!trimmed) return [];

  // JSON support
  if (filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      const arr = Array.isArray(parsedJson) ? parsedJson : parsedJson.orders || parsedJson.vendas || [];
      return arr.map((item: any, idx: number) => {
        const rawChannel = String(item.channel || item.canal || item.platform || 'Mercado Livre').toLowerCase();
        const channel: 'Mercado_Livre' | 'Shopee' = rawChannel.includes('shopee') || rawChannel.includes('shp')
          ? 'Shopee'
          : 'Mercado_Livre';
        const sku = String(item.sku || item.SKU || '').trim();
        const title = String(item.productName || item.produto || item.title || sku || 'Peça Impressa 3D').trim();
        const matched = findMatchingCatalogProduct(title, sku, catalogProducts);
        const qty = Math.max(1, Number(item.quantity || item.quantidade || 1));
        const gross = Math.max(0, Number(item.grossAmount || item.valorBruto || item.total || 0));
        const fee = Math.max(0, Number(item.marketplaceFee || item.taxa || 0));
        const shipping = Math.max(0, Number(item.shippingFee || item.frete || 0));
        const net =
          item.netAmount !== undefined || item.valorLiquido !== undefined
            ? Math.max(0, Number(item.netAmount ?? item.valorLiquido))
            : Math.max(0, Math.round((gross - fee - shipping) * 100) / 100);

        return {
          id: `imp_json_${Date.now()}_${idx}`,
          externalOrderId: String(item.externalOrderId || item.orderId || item.idPedido || `${channel === 'Shopee' ? 'SHP' : 'MLB'}-${1000 + idx}`),
          dateIso: String(item.dateIso || item.data || new Date().toISOString().slice(0, 10)).slice(0, 10),
          timeStr: String(item.timeStr || item.horario || '14:00').slice(0, 5),
          channel,
          externalProductTitle: title,
          sku: sku || matched?.sku || 'SEM-SKU',
          quantity: qty,
          grossAmount: gross,
          marketplaceFee: fee,
          shippingFee: shipping,
          netAmount: net,
          buyerName: String(item.buyerName || item.cliente || `Comprador ${channel === 'Shopee' ? 'Shopee' : 'ML'}`),
          matchedProductId: matched?.id || '',
          selected: true,
        };
      });
    } catch {
      return [];
    }
  }

  // CSV parsing (supports comma or semicolon delimiter)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h) =>
    h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );

  const findColIndex = (keywords: string[], fallbackIdx: number): number => {
    const idx = headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));
    return idx >= 0 ? idx : fallbackIdx;
  };

  const idxOrderId = findColIndex(['id_pedido', 'pedido', 'order', 'codigo'], 0);
  const idxDate = findColIndex(['data', 'date'], 1);
  const idxTime = findColIndex(['hora', 'time'], 2);
  const idxChannel = findColIndex(['canal', 'channel', 'plataforma', 'marketplace'], 3);
  const idxSku = findColIndex(['sku', 'referencia'], 4);
  const idxTitle = findColIndex(['produto', 'titulo', 'item', 'anuncio', 'title'], 5);
  const idxBuyer = findColIndex(['cliente', 'comprador', 'buyer'], 6);
  const idxQty = findColIndex(['qtd', 'quant', 'unidades', 'qty'], 7);
  const idxGross = findColIndex(['bruto', 'gross', 'total_venda', 'valor_venda'], 8);
  const idxFee = findColIndex(['taxa', 'comissao', 'frete', 'fee', 'desconto'], 9);
  const idxNet = findColIndex(['liquido', 'net', 'recebido', 'repasse'], 10);

  const parseNum = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.replace(/[R$\s]/g, '');
    // Handle Brazilian format 1.234,56 vs standard 1234.56
    if (cleaned.includes(',') && cleaned.includes('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned) || 0;
  };

  const rows: ImportedMarketplaceOrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length < 3) continue;

    const rawOrderId = cols[idxOrderId] || `PED-${1000 + i}`;
    const rawChannel = (cols[idxChannel] || rawOrderId).toLowerCase();
    const channel: 'Mercado_Livre' | 'Shopee' =
      rawChannel.includes('shopee') || rawChannel.includes('shp')
        ? 'Shopee'
        : 'Mercado_Livre';

    const rawSku = cols[idxSku] || '';
    const rawTitle = cols[idxTitle] || rawSku || 'Item Marketplace 3D';
    const matched = findMatchingCatalogProduct(rawTitle, rawSku, catalogProducts);

    const quantity = Math.max(1, Math.round(parseNum(cols[idxQty]) || 1));
    const grossAmount = Math.max(0, parseNum(cols[idxGross]));
    const feePlusShipping = Math.max(0, parseNum(cols[idxFee]));
    const parsedNet = parseNum(cols[idxNet]);
    const netAmount =
      parsedNet > 0
        ? parsedNet
        : Math.max(0, Math.round((grossAmount - feePlusShipping) * 100) / 100);

    rows.push({
      id: `imp_csv_${Date.now()}_${i}`,
      externalOrderId: rawOrderId,
      dateIso: (cols[idxDate] || new Date().toISOString().slice(0, 10)).slice(0, 10),
      timeStr: (cols[idxTime] || '14:30').slice(0, 5),
      channel,
      externalProductTitle: rawTitle,
      sku: rawSku || matched?.sku || 'SKU-3D',
      quantity,
      grossAmount,
      marketplaceFee: feePlusShipping,
      shippingFee: 0,
      netAmount,
      buyerName:
        cols[idxBuyer] ||
        (channel === 'Shopee' ? 'Cliente Shopee' : 'Cliente Mercado Livre'),
      matchedProductId: matched?.id || '',
      selected: true,
    });
  }

  return rows;
}

/**
 * Gera textos persuasivos e otimizados para SEO de Impressão 3D (Opção 3: Copy & Paste com 1 Clique).
 */
export interface Generated3DListingCopy {
  seoTitle: string;
  persuasiveDescription: string;
  directPriceFormatted: string;
  mlPriceDetail: MarketplacePriceDetail;
  shopeePriceDetail: MarketplacePriceDetail;
  materialLabel: string;
}

export function generate3DProductAdCopy(
  product: ProductRecord,
  integrations?: MarketplaceIntegrationsConfig
): Generated3DListingCopy {
  const isResin = product.technology === 'SLA_Resina';
  const materialLabel = isResin
    ? 'Resina Photopolymer 8K ABS-Like (Cura UV Profissional)'
    : 'Polímero Técnico de Alta Resistência (PLA Premium / PETG)';

  const seoTitle = `${product.name} | Impressão 3D ${
    isResin ? 'Resina 8K Alta Definição' : 'Reforçado Premium'
  } (${product.sku})`.slice(0, 120);

  const mlPriceDetail = getProductMarketplacePriceDetail(
    product,
    'mercadoLivre',
    integrations
  );
  const shopeePriceDetail = getProductMarketplacePriceDetail(
    product,
    'shopee',
    integrations
  );

  const extraComponentsLine =
    product.extraSupplies && product.extraSupplies.length > 0
      ? `\n🔩 COMPONENTES EXTRAS INCLUSOS:\n${product.extraSupplies
          .map((s) => `• ${s.quantity}x ${s.name}`)
          .join('\n')}\n`
      : '';

  const persuasiveDescription = `✨ ${product.name.toUpperCase()} — MANUFATURA ADITIVA DE ALTA PRECISÃO
Código de Referência (SKU): ${product.sku}
Categoria: ${product.category}

📝 DESCRIÇÃO DO PRODUTO:
${
  product.description ||
  'Peça produzida com rigoroso controle de qualidade dimensional e acabamento premium em impressão 3D profissional.'
}
${extraComponentsLine}
⚙️ ESPECIFICAÇÕES TÉCNICAS:
• Tecnologia de Fabricação: ${
    isResin ? 'Impressão 3D SLA Resina 8K' : 'Impressão 3D FDM de Alta Densidade'
  }
• Material Utilizado: ${materialLabel}
• Peso Aproximado da Peça: ${product.weightGrams}g
• Tempo de Produção em Máquina: ${product.printTimeHours}h ${product.printTimeMinutes}min
• Pronta Entrega / Estoque Atual: ${product.stockQuantity} unidades disponíveis

☀️ CUIDADOS E CONSERVAÇÃO (IMPORTANTE):
• Não expor diretamente ao sol intenso ou fontes de calor acima de 55°C por períodos prolongados (como painel de veículos sob o sol).
• Para limpeza, utilize apenas pano levemente úmido com água e sabão neutro. Não utilize solventes ou produtos abrasivos.

🔍 NOTA SOBRE IMPRESSÃO 3D:
• Produto fabricado via manufatura aditiva (Impressão 3D). A peça pode apresentar sutis linhas de camada características do processo de fabricação em 3D, que atestam sua autenticidade e não comprometem sua resistência ou estética.

📦 ENVIO RÁPIDO E EMBALAGEM REFORÇADA:
• Todos os produtos são inspecionados individualmente e enviados em embalagem protegida contra impactos.`;

  return {
    seoTitle,
    persuasiveDescription,
    directPriceFormatted: formatCurrencyBRL(product.unitPrice),
    mlPriceDetail,
    shopeePriceDetail,
    materialLabel,
  };
}

/**
 * Gera planilha CSV de cadastro em massa compatível com Mercado Livre e Shopee (Opção 2).
 */
export function generateMarketplaceCatalogBulkCsv(
  products: ProductRecord[],
  integrations?: MarketplaceIntegrationsConfig
): string {
  const headers = [
    'SKU',
    'Titulo_Otimizado_SEO',
    'Categoria',
    'Tecnologia_3D',
    'Peso_Gramas',
    'Estoque_Disponivel',
    'Preco_Venda_Direta_BRL',
    'Preco_Sugerido_MercadoLivre_BRL',
    'Preco_Sugerido_Shopee_BRL',
    'Descricao_Tecnica_3D',
    'URL_Foto',
  ];

  const escapeCsvCell = (val: string | number): string => {
    const str = String(val ?? '').replace(/\r?\n/g, ' | ');
    if (str.includes(',') || str.includes('"') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = products.map((product) => {
    const copy = generate3DProductAdCopy(product, integrations);
    return [
      escapeCsvCell(product.sku),
      escapeCsvCell(copy.seoTitle),
      escapeCsvCell(product.category),
      escapeCsvCell(product.technology === 'SLA_Resina' ? 'SLA Resina' : 'FDM Filamento'),
      escapeCsvCell(product.weightGrams),
      escapeCsvCell(product.stockQuantity),
      escapeCsvCell(product.unitPrice.toFixed(2)),
      escapeCsvCell(copy.mlPriceDetail.listingPrice.toFixed(2)),
      escapeCsvCell(copy.shopeePriceDetail.listingPrice.toFixed(2)),
      escapeCsvCell(copy.persuasiveDescription),
      escapeCsvCell(
        product.imageUrl?.startsWith('data:')
          ? `https://cdn.printmais3d.com.br/produtos/${product.sku.toLowerCase()}.png`
          : product.imageUrl || ''
      ),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Calcula o resumo financeiro comparativo de Vendas por Canal para o Dashboard:
 * Venda Direta / WhatsApp vs. Shopee vs. Mercado Livre
 */
export interface ChannelSalesMetric {
  channelKey: 'direta' | 'shopee' | 'mercado_livre';
  label: string;
  shortLabel: string;
  ordersCount: number;
  itemsSold: number;
  grossRevenue: number;
  marketplaceFees: number;
  netRevenue: number;
  productionCost: number;
  netProfit: number;
  shareOfGrossPercent: number;
}

export function computeSalesByChannelSummary(
  sales: SaleRecord[],
  transactions: TransactionRecord[] = []
): {
  channels: ChannelSalesMetric[];
  totalGrossRevenue: number;
  totalMarketplaceFees: number;
  totalNetProfit: number;
} {
  const buckets: Record<
    'direta' | 'shopee' | 'mercado_livre',
    Omit<ChannelSalesMetric, 'shareOfGrossPercent'>
  > = {
    direta: {
      channelKey: 'direta',
      label: 'Venda Direta / WhatsApp / Balcão',
      shortLabel: 'Venda Direta',
      ordersCount: 0,
      itemsSold: 0,
      grossRevenue: 0,
      marketplaceFees: 0,
      netRevenue: 0,
      productionCost: 0,
      netProfit: 0,
    },
    shopee: {
      channelKey: 'shopee',
      label: 'Shopee Oficial',
      shortLabel: 'Shopee',
      ordersCount: 0,
      itemsSold: 0,
      grossRevenue: 0,
      marketplaceFees: 0,
      netRevenue: 0,
      productionCost: 0,
      netProfit: 0,
    },
    mercado_livre: {
      channelKey: 'mercado_livre',
      label: 'Mercado Livre (Clássico/Premium)',
      shortLabel: 'Mercado Livre',
      ordersCount: 0,
      itemsSold: 0,
      grossRevenue: 0,
      marketplaceFees: 0,
      netRevenue: 0,
      productionCost: 0,
      netProfit: 0,
    },
  };

  const processedSaleIds = new Set<string>();

  for (const sale of sales) {
    processedSaleIds.add(sale.id);
    const key: 'direta' | 'shopee' | 'mercado_livre' =
      sale.salesChannel === 'Shopee'
        ? 'shopee'
        : sale.salesChannel === 'Mercado_Livre'
        ? 'mercado_livre'
        : 'direta';

    const bucket = buckets[key];
    bucket.ordersCount += 1;
    bucket.itemsSold += Math.max(1, Number(sale.totalQuantity) || 1);

    const netRev = Math.max(0, Number(sale.totalAmount) || 0);
    const fee = Math.max(
      0,
      Number(sale.marketplaceFeeAmount) ||
        (sale.grossAmount && sale.grossAmount > netRev
          ? sale.grossAmount - netRev
          : key === 'shopee'
          ? Math.round(netRev * 0.25 * 100) / 100
          : key === 'mercado_livre'
          ? Math.round(netRev * 0.21 * 100) / 100
          : 0)
    );
    const grossRev =
      sale.grossAmount && sale.grossAmount >= netRev
        ? sale.grossAmount
        : Math.round((netRev + fee) * 100) / 100;

    bucket.grossRevenue += grossRev;
    bucket.marketplaceFees += fee;
    bucket.netRevenue += netRev;
    bucket.productionCost += Math.max(0, Number(sale.totalCost) || 0);
    bucket.netProfit += Number(sale.netProfit) || 0;
  }

  // Also check income transactions not already linked to a processed SaleRecord
  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    if (tx.saleId && processedSaleIds.has(tx.saleId)) continue;

    const titleLower = (tx.title || '').toLowerCase();
    const key: 'direta' | 'shopee' | 'mercado_livre' =
      tx.salesChannel === 'Shopee' || titleLower.includes('shopee')
        ? 'shopee'
        : tx.salesChannel === 'Mercado_Livre' || titleLower.includes('mercado livre')
        ? 'mercado_livre'
        : 'direta';

    const bucket = buckets[key];
    bucket.ordersCount += 1;
    bucket.itemsSold += 1;
    const netRev = Math.max(0, Number(tx.amount) || 0);
    const fee = Math.max(0, Number(tx.marketplaceFeeAmount) || 0);
    const grossRev =
      tx.grossAmount && tx.grossAmount >= netRev
        ? tx.grossAmount
        : netRev + fee;

    bucket.grossRevenue += grossRev;
    bucket.marketplaceFees += fee;
    bucket.netRevenue += netRev;
    const estCost = Math.round(netRev * 0.45 * 100) / 100;
    bucket.productionCost += estCost;
    bucket.netProfit += Math.round((netRev - estCost) * 100) / 100;
  }

  const totalGrossRevenue =
    buckets.direta.grossRevenue +
    buckets.shopee.grossRevenue +
    buckets.mercado_livre.grossRevenue;
  const totalMarketplaceFees =
    buckets.direta.marketplaceFees +
    buckets.shopee.marketplaceFees +
    buckets.mercado_livre.marketplaceFees;
  const totalNetProfit =
    buckets.direta.netProfit +
    buckets.shopee.netProfit +
    buckets.mercado_livre.netProfit;

  const channels: ChannelSalesMetric[] = (
    ['direta', 'mercado_livre', 'shopee'] as const
  ).map((k) => {
    const b = buckets[k];
    return {
      ...b,
      grossRevenue: Math.round(b.grossRevenue * 100) / 100,
      marketplaceFees: Math.round(b.marketplaceFees * 100) / 100,
      netRevenue: Math.round(b.netRevenue * 100) / 100,
      productionCost: Math.round(b.productionCost * 100) / 100,
      netProfit: Math.round(b.netProfit * 100) / 100,
      shareOfGrossPercent:
        totalGrossRevenue > 0
          ? Math.round((b.grossRevenue / totalGrossRevenue) * 1000) / 10
          : 0,
    };
  });

  return {
    channels,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalMarketplaceFees: Math.round(totalMarketplaceFees * 100) / 100,
    totalNetProfit: Math.round(totalNetProfit * 100) / 100,
  };
}
