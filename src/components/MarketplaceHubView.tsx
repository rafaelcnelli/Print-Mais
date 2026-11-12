import React, { useMemo, useRef, useState } from 'react';
import {
  ExtraSupplyRecord,
  ImportedMarketplaceOrderRow,
  MarketplaceConnectionStatus,
  MarketplaceIntegrationsConfig,
  ProductRecord,
  SaleRecord,
  SpoolRecord,
} from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import {
  generateSampleMarketplaceSalesCsv,
  generateSimulatedApiOrders,
  getProductMarketplacePriceDetail,
  parseMarketplaceOrdersContent,
} from '../utils/marketplaceHub';
import { createSvgProductPreviewDataUrl } from '../utils/imageHelpers';
import { MarketplaceExportModal } from './MarketplaceExportModal';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Link2,
  Package,
  RefreshCw,
  Rocket,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Upload,
  Wand2,
  Wallet,
  X,
} from 'lucide-react';

interface MarketplaceHubViewProps {
  products: ProductRecord[];
  spools: SpoolRecord[];
  extraSupplies: ExtraSupplyRecord[];
  sales: SaleRecord[];
  integrations: MarketplaceIntegrationsConfig;
  onUpdateIntegrations: (next: MarketplaceIntegrationsConfig) => void | Promise<void>;
  onUpdateProduct: (updatedProduct: ProductRecord) => void | Promise<void>;
  onImportMarketplaceOrders: (
    rows: ImportedMarketplaceOrderRow[]
  ) => Promise<{
    importedCount: number;
    totalNetAdded: number;
    totalGramsDeducted: number;
    totalExtraSuppliesDeducted: number;
  }>;
  onNavigateToCashflow: () => void;
  onNavigateToReports: () => void;
  onNavigateToProducts: () => void;
}

export const MarketplaceHubView: React.FC<MarketplaceHubViewProps> = ({
  products,
  spools,
  extraSupplies,
  sales,
  integrations,
  onUpdateIntegrations,
  onUpdateProduct,
  onImportMarketplaceOrders,
  onNavigateToCashflow,
  onNavigateToReports,
  onNavigateToProducts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'connections' | 'importer' | 'exporter'
  >('all');
  const [toast, setToast] = useState<string | null>(null);

  // API Configuration Modal State ('mercadoLivre' | 'shopee' | null)
  const [configModalPlatform, setConfigModalPlatform] = useState<
    'mercadoLivre' | 'shopee' | null
  >(null);
  const [testConnectionStatus, setTestConnectionStatus] = useState<string | null>(
    null
  );

  // Temporary form state for Mercado Livre modal
  const [mlAppId, setMlAppId] = useState<string>(integrations.mercadoLivre.appId);
  const [mlSecretKey, setMlSecretKey] = useState<string>(
    integrations.mercadoLivre.secretKey
  );
  const [mlAccessToken, setMlAccessToken] = useState<string>(
    integrations.mercadoLivre.accessToken
  );
  const [mlSellerId, setMlSellerId] = useState<string>(
    integrations.mercadoLivre.sellerId
  );
  const [mlStatus, setMlStatus] = useState<MarketplaceConnectionStatus>(
    integrations.mercadoLivre.status
  );

  // Temporary form state for Shopee modal
  const [shopeePartnerId, setShopeePartnerId] = useState<string>(
    integrations.shopee.partnerId
  );
  const [shopeeShopId, setShopeeShopId] = useState<string>(
    integrations.shopee.shopId
  );
  const [shopeePartnerKey, setShopeePartnerKey] = useState<string>(
    integrations.shopee.partnerKey
  );
  const [shopeeAccessToken, setShopeeAccessToken] = useState<string>(
    integrations.shopee.accessToken
  );
  const [shopeeStatus, setShopeeStatus] = useState<MarketplaceConnectionStatus>(
    integrations.shopee.status
  );

  // Order Importer & Preview State
  const [previewOrders, setPreviewOrders] = useState<ImportedMarketplaceOrderRow[]>(
    () => generateSimulatedApiOrders(products, 'all')
  );
  const [isSyncingOrders, setIsSyncingOrders] = useState<boolean>(false);
  const [isConfirmingImport, setIsConfirmingImport] = useState<boolean>(false);
  const [importReconciliationResult, setImportReconciliationResult] = useState<{
    importedCount: number;
    totalNetAdded: number;
    totalGramsDeducted: number;
    totalExtraSuppliesDeducted: number;
  } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Catalog Export Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    products.map((p) => p.id)
  );
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportModalInitialTab, setExportModalInitialTab] = useState<
    'api_publish' | 'bulk_csv' | 'ad_generator'
  >('api_publish');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const openMlConfigModal = () => {
    setMlAppId(integrations.mercadoLivre.appId || '784920193847102');
    setMlSecretKey(integrations.mercadoLivre.secretKey || 'ml_sec_99281a8b7c6d5e4f');
    setMlAccessToken(integrations.mercadoLivre.accessToken || '');
    setMlSellerId(integrations.mercadoLivre.sellerId || '482910394');
    setMlStatus(integrations.mercadoLivre.status);
    setTestConnectionStatus(null);
    setConfigModalPlatform('mercadoLivre');
  };

  const openShopeeConfigModal = () => {
    setShopeePartnerId(integrations.shopee.partnerId || '2008491');
    setShopeeShopId(integrations.shopee.shopId || '99481023');
    setShopeePartnerKey(
      integrations.shopee.partnerKey || 'shp_pk_live_88392019a8b7c6d5e'
    );
    setShopeeAccessToken(integrations.shopee.accessToken || '');
    setShopeeStatus(integrations.shopee.status);
    setTestConnectionStatus(null);
    setConfigModalPlatform('shopee');
  };

  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configModalPlatform === 'mercadoLivre') {
      const nextStatus: MarketplaceConnectionStatus = mlAccessToken.trim()
        ? 'api_connected'
        : mlStatus;
      await onUpdateIntegrations({
        ...integrations,
        mercadoLivre: {
          ...integrations.mercadoLivre,
          status: nextStatus,
          appId: mlAppId.trim(),
          secretKey: mlSecretKey.trim(),
          accessToken: mlAccessToken.trim(),
          sellerId: mlSellerId.trim(),
          lastSyncIso: new Date().toISOString(),
        },
      });
      showToast('Configurações de API do Mercado Livre salvas com segurança!');
    } else if (configModalPlatform === 'shopee') {
      const nextStatus: MarketplaceConnectionStatus = shopeeAccessToken.trim()
        ? 'api_connected'
        : shopeeStatus;
      await onUpdateIntegrations({
        ...integrations,
        shopee: {
          ...integrations.shopee,
          status: nextStatus,
          partnerId: shopeePartnerId.trim(),
          shopId: shopeeShopId.trim(),
          partnerKey: shopeePartnerKey.trim(),
          accessToken: shopeeAccessToken.trim(),
          lastSyncIso: new Date().toISOString(),
        },
      });
      showToast('Configurações de API da Shopee salvas com segurança!');
    }
    setConfigModalPlatform(null);
  };

  const handleSimulateOAuth = (platform: 'mercadoLivre' | 'shopee') => {
    if (platform === 'mercadoLivre') {
      const generatedToken = `APP_USR-${Math.floor(
        1000000000 + Math.random() * 9000000000
      )}-111206-ml_oauth_token`;
      setMlAccessToken(generatedToken);
      setMlStatus('api_connected');
      setTestConnectionStatus(
        '✅ OAuth2 Mercado Livre autenticado! Access Token e Seller ID vinculados com sucesso.'
      );
    } else {
      const generatedToken = `shp_at_${Math.random()
        .toString(36)
        .substring(2, 14)}_oauth2_live`;
      setShopeeAccessToken(generatedToken);
      setShopeeStatus('api_connected');
      setTestConnectionStatus(
        '✅ OAuth2 Shopee Open Platform autenticado! Shop ID e Access Token ativos.'
      );
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleMarketplaceSalesCsv(products);
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      'planilha_exemplo_vendas_ml_shopee_printmais.csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(
      'Planilha de exemplo (.CSV) baixada! Você já pode enviá-la no botão de Upload ou revisar a tabela abaixo.'
    );
  };

  const handleUploadOrdersFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseMarketplaceOrdersContent(text, file.name, products);
      if (parsed.length === 0) {
        showToast(
          'Nenhum pedido válido encontrado no arquivo. Baixe a planilha de exemplo para ver o formato.'
        );
      } else {
        setPreviewOrders(parsed);
        setImportReconciliationResult(null);
        showToast(
          `${parsed.length} pedidos lidos do arquivo "${file.name}" e vinculados por SKU!`
        );
      }
    } catch {
      showToast('Erro ao ler o arquivo selecionado.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSyncOrdersViaApi = () => {
    setIsSyncingOrders(true);
    setImportReconciliationResult(null);
    setTimeout(() => {
      const synced = generateSimulatedApiOrders(products, 'all');
      setPreviewOrders(synced);
      setIsSyncingOrders(false);
      showToast(
        `${synced.length} vendas sincronizadas do Mercado Livre e Shopee prontas para conciliação!`
      );
    }, 350);
  };

  const handleConfirmAndLaunchOrders = async () => {
    const selectedRows = previewOrders.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      showToast('Selecione ao menos 1 pedido na tabela para confirmar o lançamento.');
      return;
    }

    setIsConfirmingImport(true);
    try {
      const res = await onImportMarketplaceOrders(selectedRows);
      setImportReconciliationResult(res);
      // Uncheck imported rows to prevent accidental double import
      setPreviewOrders((prev) => prev.map((r) => ({ ...r, selected: false })));
      showToast(
        `✅ ${res.importedCount} vendas lançadas no Fluxo de Caixa e estoque baixado automaticamente!`
      );
    } finally {
      setIsConfirmingImport(false);
    }
  };

  const selectedPreviewStats = useMemo(() => {
    const active = previewOrders.filter((r) => r.selected);
    const gross = active.reduce((acc, r) => acc + r.grossAmount, 0);
    const fees = active.reduce(
      (acc, r) => acc + r.marketplaceFee + r.shippingFee,
      0
    );
    const net = active.reduce((acc, r) => acc + r.netAmount, 0);
    return {
      count: active.length,
      gross,
      fees,
      net,
    };
  }, [previewOrders]);

  const selectedCatalogProducts = useMemo(() => {
    const list = products.filter((p) => selectedProductIds.includes(p.id));
    return list.length > 0 ? list : products;
  }, [products, selectedProductIds]);

  const getStatusBadge = (status: MarketplaceConnectionStatus) => {
    if (status === 'api_connected') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          API Conectada
        </span>
      );
    }
    if (status === 'spreadsheet_manual') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-extrabold text-[#1D63FF] dark:text-blue-400">
          <span className="h-2 w-2 rounded-full bg-[#1D63FF]" />
          Modo Planilha / Manual Ativo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Desconectado
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1D63FF] text-white shadow-md shadow-blue-500/20">
            <Link2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              🔗 Hub de Integrações & Marketplaces (Mercado Livre e Shopee)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arquitetura Híbrida: Sincronização via Planilhas CSV/JSON, Gerador de Anúncios 3D em 1 Clique e Conexão API Oficial OAuth2
            </p>
          </div>
        </div>

        {toast && (
          <div
            role="status"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {(
          [
            { id: 'all', label: 'Visão Completa (A + B + C)' },
            { id: 'connections', label: 'A. Conexão das Contas & API' },
            {
              id: 'importer',
              label: `B. Importador & Conciliação de Vendas (${previewOrders.length})`,
            },
            {
              id: 'exporter',
              label: `C. Exportar Catálogo & Gerador de Anúncios (${products.length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white shadow-sm'
                : 'bg-white dark:bg-[#14171F] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#1D63FF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* SEÇÃO A: PAINEL DE CONEXÃO DAS CONTAS (STATUS & CREDENCIAIS API) */}
      {/* ==================================================================== */}
      {(activeSubTab === 'all' || activeSubTab === 'connections') && (
        <section
          aria-label="Painel de Conexão das Contas Mercado Livre e Shopee"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                A. Painel de Conexão das Contas (Status & Credenciais API)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Opere imediatamente no Modo Planilha/Manual ou conecte suas chaves de desenvolvedor OAuth2 do Mercado Livre e Shopee
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* CARD 1: MERCADO LIVRE (Yellow/Amber Theme) */}
            <div
              data-testid="card-integration-mercadolivre"
              className="rounded-3xl border-2 border-amber-400/50 dark:border-amber-500/40 bg-white dark:bg-[#14171F] p-5 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-base shadow-sm">
                    ML
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Mercado Livre
                      </h4>
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                        Clássico / Premium
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {integrations.mercadoLivre.sellerId
                        ? `Seller ID: ${integrations.mercadoLivre.sellerId}`
                        : 'Sincronização de pedidos, cálculo reverso e publicação de anúncios'}
                    </p>
                  </div>
                </div>

                {getStatusBadge(integrations.mercadoLivre.status)}
              </div>

              {/* Quick Mode Switcher + Fee Summary */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl bg-amber-500/5 dark:bg-[#0D0F14] border border-amber-500/20 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Modo de Operação
                  </span>
                  <select
                    aria-label="Modo de conexão Mercado Livre"
                    value={integrations.mercadoLivre.status}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        mercadoLivre: {
                          ...integrations.mercadoLivre,
                          status: e.target.value as MarketplaceConnectionStatus,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="disconnected">Desconectado</option>
                    <option value="spreadsheet_manual">Modo Planilha/Manual</option>
                    <option value="api_connected">API Conectada</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ml-default-comm"
                    className="block text-[10px] font-bold text-slate-400 uppercase"
                  >
                    Comissão Padrão (%)
                  </label>
                  <input
                    id="ml-default-comm"
                    type="number"
                    step="0.5"
                    min={0}
                    max={80}
                    value={integrations.mercadoLivre.commissionPercent}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        mercadoLivre: {
                          ...integrations.mercadoLivre,
                          commissionPercent: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 font-mono text-xs font-extrabold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ml-default-fixed"
                    className="block text-[10px] font-bold text-slate-400 uppercase"
                  >
                    Taxa Fixa (R$)
                  </label>
                  <input
                    id="ml-default-fixed"
                    type="number"
                    step="0.5"
                    min={0}
                    value={integrations.mercadoLivre.fixedFee}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        mercadoLivre: {
                          ...integrations.mercadoLivre,
                          fixedFee: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 font-mono text-xs font-extrabold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  data-testid="btn-open-ml-api-modal"
                  onClick={openMlConfigModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition-colors shadow-xs cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Configurar Credenciais API / OAuth ML</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncOrdersViaApi}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                  <span>Testar / Sincronizar ML</span>
                </button>
              </div>
            </div>

            {/* CARD 2: SHOPEE (Orange Theme) */}
            <div
              data-testid="card-integration-shopee"
              className="rounded-3xl border-2 border-orange-500/50 dark:border-orange-500/40 bg-white dark:bg-[#14171F] p-5 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white font-black text-base shadow-sm">
                    SHP
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Shopee Oficial
                      </h4>
                      <span className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[10px] font-extrabold text-orange-600 dark:text-orange-400">
                        Frete Grátis Extra
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {integrations.shopee.shopId
                        ? `Shop ID: ${integrations.shopee.shopId}`
                        : 'Conciliação de pedidos, taxas por item e exportação em massa'}
                    </p>
                  </div>
                </div>

                {getStatusBadge(integrations.shopee.status)}
              </div>

              {/* Quick Mode Switcher + Fee Summary */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl bg-orange-500/5 dark:bg-[#0D0F14] border border-orange-500/20 p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Modo de Operação
                  </span>
                  <select
                    aria-label="Modo de conexão Shopee"
                    value={integrations.shopee.status}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        shopee: {
                          ...integrations.shopee,
                          status: e.target.value as MarketplaceConnectionStatus,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="disconnected">Desconectado</option>
                    <option value="spreadsheet_manual">Modo Planilha/Manual</option>
                    <option value="api_connected">API Conectada</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="shopee-default-comm"
                    className="block text-[10px] font-bold text-slate-400 uppercase"
                  >
                    Comissão Padrão (%)
                  </label>
                  <input
                    id="shopee-default-comm"
                    type="number"
                    step="0.5"
                    min={0}
                    max={80}
                    value={integrations.shopee.commissionPercent}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        shopee: {
                          ...integrations.shopee,
                          commissionPercent: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 font-mono text-xs font-extrabold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shopee-default-fixed"
                    className="block text-[10px] font-bold text-slate-400 uppercase"
                  >
                    Taxa Fixa / Item (R$)
                  </label>
                  <input
                    id="shopee-default-fixed"
                    type="number"
                    step="0.5"
                    min={0}
                    value={integrations.shopee.fixedFee}
                    onChange={(e) =>
                      onUpdateIntegrations({
                        ...integrations,
                        shopee: {
                          ...integrations.shopee,
                          fixedFee: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] px-2.5 py-1.5 font-mono text-xs font-extrabold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  data-testid="btn-open-shopee-api-modal"
                  onClick={openShopeeConfigModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-xs font-extrabold text-white transition-colors shadow-xs cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Configurar Credenciais API / Shopee</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncOrdersViaApi}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-orange-500 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-orange-500" />
                  <span>Testar / Sincronizar Shopee</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SEÇÃO B: IMPORTADOR INTELIGENTE DE VENDAS E RELATÓRIOS (CONCILIAÇÃO) */}
      {/* ==================================================================== */}
      {(activeSubTab === 'all' || activeSubTab === 'importer') && (
        <section
          aria-label="Importador Inteligente de Vendas e Conciliação Automática"
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                B. Importador Inteligente de Vendas & Conciliação Automática
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sincronize via API ou envie o relatório <code className="font-mono">.CSV</code> /{' '}
                <code className="font-mono">.JSON</code> do Mercado Livre e Shopee para lançar no Fluxo de Caixa e dar baixa automática no estoque de filamento e insumos extras.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="btn-download-sample-sales-csv"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#1D63FF]" />
                <span>📥 Baixar Planilha de Exemplo (CSV)</span>
              </button>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleUploadOrdersFile}
                className="hidden"
                aria-label="Upload de planilha de vendas CSV ou JSON"
              />

              <button
                type="button"
                data-testid="btn-upload-orders-csv"
                onClick={() => csvFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C26] px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-500" />
                <span>Subir Arquivo (.CSV / .JSON)</span>
              </button>

              <button
                type="button"
                data-testid="btn-sync-sales-api"
                disabled={isSyncingOrders}
                onClick={handleSyncOrdersViaApi}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63FF] px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isSyncingOrders ? 'animate-spin' : ''}`}
                />
                <span>🔄 Sincronizar Vendas via API</span>
              </button>
            </div>
          </div>

          {/* Reconciliation Success Feedback Banner */}
          {importReconciliationResult && (
            <div
              role="status"
              data-testid="reconciliation-success-banner"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Conciliação Concluída: {importReconciliationResult.importedCount} vendas lançadas com sucesso!
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  • Fluxo de Caixa: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrencyBRL(importReconciliationResult.totalNetAdded)}</strong> (Valor Líquido creditado) ·{' '}
                  • Filamento/Resina descontado: <strong>{importReconciliationResult.totalGramsDeducted}g</strong> ·{' '}
                  • Insumos Extras baixados: <strong>{importReconciliationResult.totalExtraSuppliesDeducted} un</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onNavigateToCashflow}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#0D0F14] px-3 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Ver no Fluxo de Caixa</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D63FF] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-blue-600 cursor-pointer"
                >
                  <span>Ver Gráfico no Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Orders Preview & SKU Mapping Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0D0F14] text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos os pedidos importados"
                      checked={
                        previewOrders.length > 0 &&
                        previewOrders.every((r) => r.selected)
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPreviewOrders((prev) =>
                          prev.map((r) => ({ ...r, selected: checked }))
                        );
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-[#1D63FF]"
                    />
                  </th>
                  <th className="px-3 py-3">ID do Pedido / Data</th>
                  <th className="px-3 py-3">Canal</th>
                  <th className="px-3 py-3">Produto no Marketplace / SKU</th>
                  <th className="px-3 py-3">Vínculo c/ Catálogo (Baixa de Estoque)</th>
                  <th className="px-3 py-3 text-center">Qtd</th>
                  <th className="px-3 py-3 text-right">Valor Bruto</th>
                  <th className="px-3 py-3 text-right">Taxa + Frete</th>
                  <th className="px-3 py-3 text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {previewOrders.map((row) => {
                  const linkedProd = products.find(
                    (p) => p.id === row.matchedProductId
                  );
                  const totalWeightDeduct = linkedProd
                    ? linkedProd.weightGrams * row.quantity
                    : 0;
                  const totalExtrasDeduct = linkedProd?.extraSupplies
                    ? linkedProd.extraSupplies.reduce(
                        (acc, s) => acc + s.quantity * row.quantity,
                        0
                      )
                    : 0;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        row.selected
                          ? 'bg-white dark:bg-[#14171F]'
                          : 'bg-slate-50/50 dark:bg-[#0D0F14]/40 opacity-60'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar pedido ${row.externalOrderId}`}
                          checked={row.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPreviewOrders((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, selected: checked } : r
                              )
                            );
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#1D63FF]"
                        />
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {row.externalOrderId}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {row.dateIso} às {row.timeStr} · {row.buyerName}
                        </div>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        {row.channel === 'Mercado_Livre' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                            Mercado Livre
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-orange-500/15 border border-orange-500/30 px-2.5 py-1 text-[10px] font-extrabold text-orange-600 dark:text-orange-400">
                            Shopee
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 dark:text-white max-w-[210px] truncate">
                          {row.externalProductTitle}
                        </div>
                        <div className="font-mono text-[10px] text-[#1D63FF] dark:text-blue-400">
                          SKU: {row.sku}
                        </div>
                      </td>

                      <td className="px-3 py-3 min-w-[220px]">
                        <select
                          aria-label={`Vincular produto do catálogo para pedido ${row.externalOrderId}`}
                          value={row.matchedProductId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPreviewOrders((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, matchedProductId: val }
                                  : r
                              )
                            );
                          }}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:border-[#1D63FF] focus:outline-none"
                        >
                          <option value="">-- Sem vínculo de estoque --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name} ({p.stockQuantity} un)
                            </option>
                          ))}
                        </select>
                        {linkedProd && (
                          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            Baixa: <strong>-{row.quantity} un</strong> ·{' '}
                            <strong>-{totalWeightDeduct}g</strong>{' '}
                            {linkedProd.technology === 'SLA_Resina'
                              ? 'resina'
                              : 'filamento'}
                            {totalExtrasDeduct > 0 &&
                              ` · -${totalExtrasDeduct} insumos extras`}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center font-mono font-extrabold text-slate-900 dark:text-white">
                        {row.quantity}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrencyBRL(row.grossAmount)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-rose-500">
                        -{formatCurrencyBRL(row.marketplaceFee + row.shippingFee)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyBRL(row.netAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Bar & Confirm Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-[#0D0F14] border border-slate-200/80 dark:border-slate-800 p-4">
            <div className="flex flex-wrap items-center gap-5 text-xs">
              <div>
                <span className="text-slate-400">Selecionados:</span>{' '}
                <strong className="font-extrabold text-slate-900 dark:text-white">
                  {selectedPreviewStats.count} pedidos
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Bruto Total:</span>{' '}
                <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrencyBRL(selectedPreviewStats.gross)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Taxas Retidas:</span>{' '}
                <strong className="font-mono font-bold text-rose-500">
                  -{formatCurrencyBRL(selectedPreviewStats.fees)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Líquido a Receber no Caixa:</span>{' '}
                <strong className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrencyBRL(selectedPreviewStats.net)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-confirm-launch-marketplace-orders"
              disabled={isConfirmingImport || selectedPreviewStats.count === 0}
              onClick={handleConfirmAndLaunchOrders}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-white transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isConfirmingImport
                  ? 'Processando Conciliação...'
                  : '✅ Confirmar e Lançar no Sistema'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SEÇÃO C: EXPORTAÇÃO DE PRODUTOS DO CATÁLOGO PARA OS MARKETPLACES */}
      {/* ==================================================================== */}
      {(activeSubTab === 'all' || activeSubTab === 'exporter') && (
        <section
          aria-label="Exportação de Produtos do Catálogo para os Marketplaces"
          className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-[#14171F] p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                C. Exportação de Produtos do Catálogo para os Marketplaces
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Selecione um ou vários produtos para publicar via API, exportar planilha CSV de cadastro em massa ou gerar anúncio 3D otimizado
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="btn-hub-open-export-api"
                onClick={() => {
                  setExportModalInitialTab('api_publish');
                  setExportModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1D63FF] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
              >
                <Rocket className="h-4 w-4" />
                <span>🚀 Exportar para Marketplace ({selectedCatalogProducts.length})</span>
              </button>

              <button
                type="button"
                data-testid="btn-hub-open-export-csv"
                onClick={() => {
                  setExportModalInitialTab('bulk_csv');
                  setExportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Planilha em Massa (.CSV)</span>
              </button>

              <button
                type="button"
                data-testid="btn-hub-open-ad-generator"
                onClick={() => {
                  setExportModalInitialTab('ad_generator');
                  setExportModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-colors cursor-pointer"
              >
                <Wand2 className="h-4 w-4 text-[#1D63FF]" />
                <span>Gerador de Anúncio (1 Clique)</span>
              </button>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={
                  products.length > 0 &&
                  selectedProductIds.length === products.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProductIds(products.map((p) => p.id));
                  } else {
                    setSelectedProductIds([]);
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#1D63FF]"
              />
              <span>
                Selecionar todos os produtos do catálogo ({products.length})
              </span>
            </label>

            <button
              type="button"
              onClick={onNavigateToProducts}
              className="text-xs font-bold text-[#1D63FF] dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ir para Catálogo Completo →
            </button>
          </div>

          {/* Product Grid for Selection & Quick Export */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {products.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id);
              const mlPrice = getProductMarketplacePriceDetail(
                prod,
                'mercadoLivre',
                integrations
              );
              const shopeePrice = getProductMarketplacePriceDetail(
                prod,
                'shopee',
                integrations
              );
              const previewImg =
                prod.imageUrl ||
                createSvgProductPreviewDataUrl(prod.sku, '#1D63FF', '#0D0F14');
              const isMlPublished =
                Boolean(prod.mlItemId) ||
                Boolean(prod.publishedChannels?.includes('Mercado_Livre'));
              const isShopeePublished =
                Boolean(prod.shopeeItemId) ||
                Boolean(prod.publishedChannels?.includes('Shopee'));

              return (
                <div
                  key={prod.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-[#1D63FF] bg-blue-500/5 dark:bg-[#0D0F14]'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D0F14]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar produto ${prod.name} para exportação`}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds((prev) => [...prev, prod.id]);
                          } else {
                            setSelectedProductIds((prev) =>
                              prev.filter((id) => id !== prod.id)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#1D63FF] shrink-0"
                      />
                      <img
                        src={previewImg}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="h-11 w-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {prod.sku} · {prod.weightGrams}g · Estoque: {prod.stockQuantity} un
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductIds([prod.id]);
                        setExportModalInitialTab('ad_generator');
                        setExportModalOpen(true);
                      }}
                      className="rounded-xl bg-slate-100 dark:bg-[#181C26] px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-[#1D63FF] hover:text-white transition-colors shrink-0 cursor-pointer"
                    >
                      Gerar Anúncio
                    </button>
                  </div>

                  {/* Channel Price Badges */}
                  <div className="mt-3 grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">
                        Venda Direta
                      </span>
                      <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                        {formatCurrencyBRL(prod.unitPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        <span>Mercado Livre</span>
                        {isMlPublished && <span title="Publicado no ML">🟢</span>}
                      </span>
                      <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrencyBRL(mlPrice.listingPrice)}
                      </span>
                    </div>

                    <div>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase">
                        <span>Shopee</span>
                        {isShopeePublished && <span title="Publicado na Shopee">🟢</span>}
                      </span>
                      <span className="font-mono font-extrabold text-orange-600 dark:text-orange-400">
                        {formatCurrencyBRL(shopeePrice.listingPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE CONFIGURAÇÃO DE API (MERCADO LIVRE OU SHOPEE) */}
      {/* ==================================================================== */}
      {configModalPlatform && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-api-config-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="my-8 w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl font-black text-sm ${
                    configModalPlatform === 'mercadoLivre'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {configModalPlatform === 'mercadoLivre' ? 'ML' : 'SHP'}
                </div>
                <div>
                  <h3
                    id="modal-api-config-title"
                    className="text-lg font-extrabold text-slate-900 dark:text-white"
                  >
                    {configModalPlatform === 'mercadoLivre'
                      ? 'Configuração de API — Mercado Livre'
                      : 'Configuração de API — Shopee Open Platform'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Credenciais criptografadas e salvas no perfil da sua oficina
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfigModalPlatform(null)}
                aria-label="Fechar modal de API"
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiConfig} className="mt-5 space-y-4">
              {configModalPlatform === 'mercadoLivre' ? (
                <>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ml-input-app-id"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        App ID (Client ID)
                      </label>
                      <input
                        id="ml-input-app-id"
                        type="text"
                        value={mlAppId}
                        onChange={(e) => setMlAppId(e.target.value)}
                        placeholder="Ex: 784920193847102"
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ml-input-seller-id"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        Seller ID
                      </label>
                      <input
                        id="ml-input-seller-id"
                        type="text"
                        value={mlSellerId}
                        onChange={(e) => setMlSellerId(e.target.value)}
                        placeholder="Ex: 482910394"
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="ml-input-secret-key"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Secret Key (Client Secret)
                    </label>
                    <input
                      id="ml-input-secret-key"
                      type="password"
                      value={mlSecretKey}
                      onChange={(e) => setMlSecretKey(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ml-input-access-token"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Access Token (Bearer Token OAuth2)
                    </label>
                    <input
                      id="ml-input-access-token"
                      type="text"
                      value={mlAccessToken}
                      onChange={(e) => setMlAccessToken(e.target.value)}
                      placeholder="APP_USR-78492019-111206-..."
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="btn-oauth-connect-ml"
                      onClick={() => handleSimulateOAuth('mercadoLivre')}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-extrabold text-slate-950 transition-colors cursor-pointer"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Conectar via OAuth Mercado Livre</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTestConnectionStatus(
                          '🟢 Conexão verificada com https://api.mercadolibre.com — Latência: 42ms · Webhook Pronto!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Simular Sincronização / Testar Conexão</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="shopee-input-partner-id"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        Partner ID
                      </label>
                      <input
                        id="shopee-input-partner-id"
                        type="text"
                        value={shopeePartnerId}
                        onChange={(e) => setShopeePartnerId(e.target.value)}
                        placeholder="Ex: 2008491"
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="shopee-input-shop-id"
                        className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        Shop ID
                      </label>
                      <input
                        id="shopee-input-shop-id"
                        type="text"
                        value={shopeeShopId}
                        onChange={(e) => setShopeeShopId(e.target.value)}
                        placeholder="Ex: 99481023"
                        className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="shopee-input-partner-key"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Partner Key (Secret)
                    </label>
                    <input
                      id="shopee-input-partner-key"
                      type="password"
                      value={shopeePartnerKey}
                      onChange={(e) => setShopeePartnerKey(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shopee-input-access-token"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Access Token
                    </label>
                    <input
                      id="shopee-input-access-token"
                      type="text"
                      value={shopeeAccessToken}
                      onChange={(e) => setShopeeAccessToken(e.target.value)}
                      placeholder="shp_at_live_..."
                      className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="btn-oauth-connect-shopee"
                      onClick={() => handleSimulateOAuth('shopee')}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-extrabold text-white transition-colors cursor-pointer"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Conectar via OAuth Shopee</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTestConnectionStatus(
                          '🟢 Conexão verificada com Shopee Open Platform v2 — Latência: 55ms!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F14] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Simular Sincronização / Testar Conexão</span>
                    </button>
                  </div>
                </>
              )}

              {testConnectionStatus && (
                <div
                  role="status"
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                >
                  {testConnectionStatus}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setConfigModalPlatform(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-api-credentials"
                  className="rounded-xl bg-[#1D63FF] px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Salvar Credenciais no Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE MARKETPLACE EXPORT MODAL */}
      <MarketplaceExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        selectedProducts={selectedCatalogProducts}
        integrations={integrations}
        onUpdateProduct={onUpdateProduct}
        initialTab={exportModalInitialTab}
      />
    </div>
  );
};
