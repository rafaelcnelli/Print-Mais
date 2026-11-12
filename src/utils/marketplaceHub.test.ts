import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSalesByChannelSummary,
  findMatchingCatalogProduct,
  generate3DProductAdCopy,
  generateMarketplaceCatalogBulkCsv,
  generateSampleMarketplaceSalesCsv,
  getProductMarketplacePriceDetail,
  parseMarketplaceOrdersContent,
} from './marketplaceHub';
import { INITIAL_PRODUCTS, INITIAL_SALES } from './seedData';

test('getProductMarketplacePriceDetail calculates gross-up preserving direct margin', () => {
  const product = INITIAL_PRODUCTS[0]; // unitPrice 28.20
  const mlDetail = getProductMarketplacePriceDetail(product, 'mercadoLivre');
  const shopeeDetail = getProductMarketplacePriceDetail(product, 'shopee');

  assert.equal(mlDetail.listingPrice, 40.71);
  assert.equal(mlDetail.netReceived, 28.2);
  assert.equal(shopeeDetail.listingPrice, 40.25);
  assert.equal(shopeeDetail.netReceived, 28.2);
});

test('generateSampleMarketplaceSalesCsv and parseMarketplaceOrdersContent parse and match SKUs automatically', () => {
  const csv = generateSampleMarketplaceSalesCsv(INITIAL_PRODUCTS);
  assert.ok(csv.includes('MLB-2049819201'));
  assert.ok(csv.includes('SHP-261111884B'));

  const rows = parseMarketplaceOrdersContent(csv, 'vendas_ml_shopee.csv', INITIAL_PRODUCTS);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].channel, 'Mercado_Livre');
  assert.equal(rows[0].matchedProductId, INITIAL_PRODUCTS[0].id);
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].grossAmount, 122.13);
  assert.equal(rows[0].marketplaceFee, 37.53);
  assert.equal(rows[0].netAmount, 84.6);

  assert.equal(rows[1].channel, 'Shopee');
  assert.equal(rows[1].matchedProductId, INITIAL_PRODUCTS[3].id);
});

test('findMatchingCatalogProduct matches by exact SKU or title substring', () => {
  const matchSku = findMatchingCatalogProduct('Qualquer Nome', 'prd-ip65', INITIAL_PRODUCTS);
  assert.equal(matchSku?.id, 'prod_seed_1');

  const matchName = findMatchingCatalogProduct('Busto Colecionável Malenia 22cm SLA', '', INITIAL_PRODUCTS);
  assert.equal(matchName?.id, 'prod_seed_2');
});

test('generate3DProductAdCopy generates SEO title, layer lines notice, and temperature care', () => {
  const copy = generate3DProductAdCopy(INITIAL_PRODUCTS[0]);
  assert.ok(copy.seoTitle.includes('Gabinete Sensor Industrial IP65'));
  assert.ok(copy.persuasiveDescription.includes('55°C'));
  assert.ok(copy.persuasiveDescription.includes('linhas de camada'));
  assert.ok(copy.mlPriceDetail.listingPrice > INITIAL_PRODUCTS[0].unitPrice);
  assert.ok(copy.shopeePriceDetail.listingPrice > INITIAL_PRODUCTS[0].unitPrice);
});

test('generateMarketplaceCatalogBulkCsv outputs valid CSV header and rows', () => {
  const bulkCsv = generateMarketplaceCatalogBulkCsv(INITIAL_PRODUCTS);
  const lines = bulkCsv.trim().split('\n');
  assert.equal(lines.length, INITIAL_PRODUCTS.length + 1);
  assert.ok(lines[0].includes('Preco_Sugerido_MercadoLivre_BRL'));
  assert.ok(lines[1].includes('PRD-IP65'));
});

test('computeSalesByChannelSummary aggregates direct, Shopee, and Mercado Livre sales accurately', () => {
  const mockSales = [
    ...INITIAL_SALES,
    {
      ...INITIAL_SALES[0],
      id: 'sale_ml_1',
      salesChannel: 'Mercado_Livre' as const,
      totalAmount: 84.6,
      grossAmount: 122.13,
      marketplaceFeeAmount: 37.53,
      totalCost: 45.72,
      netProfit: 38.88,
    },
    {
      ...INITIAL_SALES[0],
      id: 'sale_shp_1',
      salesChannel: 'Shopee' as const,
      totalAmount: 129.8,
      grossAmount: 172.26,
      marketplaceFeeAmount: 42.46,
      totalCost: 53.0,
      netProfit: 76.8,
    },
  ];

  const summary = computeSalesByChannelSummary(mockSales, []);
  const ml = summary.channels.find((c) => c.channelKey === 'mercado_livre');
  const shopee = summary.channels.find((c) => c.channelKey === 'shopee');
  const direta = summary.channels.find((c) => c.channelKey === 'direta');

  assert.ok(ml && ml.grossRevenue === 122.13 && ml.marketplaceFees === 37.53 && ml.netProfit === 38.88);
  assert.ok(shopee && shopee.grossRevenue === 172.26 && shopee.marketplaceFees === 42.46 && shopee.netProfit === 76.8);
  assert.ok(direta && direta.ordersCount === 3);
});
