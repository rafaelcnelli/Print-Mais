import React, { useState } from 'react';
import { QuoteRecord, SaleItemRecord } from '../types';
import { formatCurrencyBRL } from '../utils/pricing';
import {
  Check,
  Copy,
  FileText,
  MessageSquare,
  Printer,
  X,
} from 'lucide-react';

interface QuotePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteRecord;
  initialMode?: 'pdf' | 'whatsapp';
}

export function getQuoteItemsList(quote: QuoteRecord): SaleItemRecord[] {
  if (quote.items && quote.items.length > 0) {
    return quote.items;
  }
  return [
    {
      productId: 'prod_fallback',
      productName: quote.projectName || 'Produto 3D',
      sku: 'PRD-3D',
      quantity: Math.max(1, quote.batchQuantity || 1),
      unitCost: quote.unitCost,
      unitPrice: quote.unitPrice,
      weightGrams: quote.weightGrams,
    },
  ];
}

export function buildQuoteWhatsAppMessage(quote: QuoteRecord): string {
  const items = getQuoteItemsList(quote);
  const validDays = quote.validDays || 7;
  const validUntilDate = new Date(
    Date.now() + validDays * 86400000
  ).toLocaleDateString('pt-BR');
  const discount = quote.discountAmount || 0;
  const shipping = quote.shippingAmount || 0;
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const lines: string[] = [
    `*ORÇAMENTO DE IMPRESSÃO 3D — PRINTMAIS*`,
    `Olá, *${quote.clientName || 'Cliente'}*! Segue a proposta comercial dos produtos solicitados:`,
    ``,
    `*ITENS DO ORÇAMENTO:*`,
    ...items.map(
      (item, idx) =>
        `${idx + 1}. *${item.quantity}x ${item.productName}* (${item.sku})\n   Unitário: ${formatCurrencyBRL(
          item.unitPrice
        )} | Subtotal: *${formatCurrencyBRL(item.unitPrice * item.quantity)}*`
    ),
    `--------------------------------`,
  ];

  if (discount > 0 || shipping > 0) {
    lines.push(`Subtotal dos Produtos: ${formatCurrencyBRL(subtotal)}`);
    if (discount > 0) {
      lines.push(`Desconto Especial: -${formatCurrencyBRL(discount)}`);
    }
    if (shipping > 0) {
      lines.push(`Frete / Entrega: +${formatCurrencyBRL(shipping)}`);
    }
  }

  lines.push(`*VALOR TOTAL DO ORÇAMENTO: ${formatCurrencyBRL(quote.totalPrice)}*`);
  lines.push(`--------------------------------`);

  if (quote.deliveryDays) {
    lines.push(`Prazo estimado de produção: *${quote.deliveryDays}*`);
  }
  if (quote.paymentTerms) {
    lines.push(`Pagamento: ${quote.paymentTerms}`);
  } else {
    lines.push(`Pagamento: PIX, Cartão ou 50% sinal + 50% na entrega`);
  }
  if (quote.notes) {
    lines.push(`Obs: ${quote.notes}`);
  }
  lines.push(`Validade da proposta: ${validUntilDate} (${validDays} dias)`);
  lines.push(``);
  lines.push(`Podemos confirmar o seu pedido?`);

  return lines.join('\n');
}

export const QuotePdfModal: React.FC<QuotePdfModalProps> = ({
  isOpen,
  onClose,
  quote,
  initialMode = 'pdf',
}) => {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdf' | 'whatsapp'>(initialMode);

  if (!isOpen) return null;

  const items = getQuoteItemsList(quote);
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const discount = quote.discountAmount || 0;
  const shipping = quote.shippingAmount || 0;
  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalWeight = items.reduce((acc, i) => acc + i.weightGrams * i.quantity, 0);

  const issueDate = new Date(quote.createdAtIso || Date.now()).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  );

  const validDays = quote.validDays || 7;
  const validUntilDate = new Date(
    Date.now() + validDays * 86400000
  ).toLocaleDateString('pt-BR');

  const whatsappText = buildQuoteWhatsAppMessage(quote);

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    } catch {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#13161F] p-6 md:p-8 shadow-2xl">
        {/* Top Action Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2
              id="pdf-modal-title"
              className="text-lg font-extrabold text-slate-900 dark:text-white"
            >
              Exportar Orçamento — PDF & Texto para WhatsApp
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Proposta comercial baseada nos produtos selecionados (sem expor seu custo ou margem interna).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#0D0F14] p-1">
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeTab === 'pdf'
                    ? 'bg-[#0D0F14] dark:bg-[#1D63FF] text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Folha PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Texto WhatsApp
              </button>
            </div>

            <button
              type="button"
              data-testid="modal-copy-whatsapp-btn"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Texto Copiado p/ WhatsApp!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar Texto WhatsApp
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1D63FF] px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Salvar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar visualização do orçamento"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* WhatsApp Highlight Box when in WhatsApp mode or below PDF */}
        {activeTab === 'whatsapp' && (
          <div className="mb-6 rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-[#0D0F14] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  PRONTO PARA COLAR NO WHATSAPP DO CLIENTE
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Mensagem Formatada com Produtos, Quantidades e Total
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar Mensagem
                  </>
                )}
              </button>
            </div>
            <pre
              data-testid="whatsapp-message-preview"
              className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141822] p-4 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200"
            >
              {whatsappText}
            </pre>
          </div>
        )}

        {/* Printable Document Sheet */}
        <div
          id="printable-quote-sheet"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D0F16] p-6 md:p-8 text-slate-900 dark:text-slate-100"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-extrabold tracking-wider text-[#1D63FF]">
                PRINTMAIS · PROPOSTA COMERCIAL DE PRODUTOS
              </span>
              <h3 className="mt-1 text-2xl font-extrabold tracking-tight">
                Orçamento #{quote.id.slice(-6).toUpperCase()}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Emitido em {issueDate} · Válido até {validUntilDate} ({validDays} dias)
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Cliente</div>
              <div className="text-base font-extrabold">
                {quote.clientName || 'Cliente Sob Consulta'}
              </div>
              {quote.clientContact && (
                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {quote.clientContact}
                </div>
              )}
              <div className="mt-1 text-xs font-semibold text-[#1D63FF]">
                {quote.deliveryDays
                  ? `Prazo estimado: ${quote.deliveryDays}`
                  : 'Produção Sob Encomenda'}
              </div>
            </div>
          </div>

          {/* Summary KPI Boxes */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141822] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Produtos Incluídos
              </div>
              <div className="mt-1 text-lg font-extrabold tabular-nums">
                {items.length} {items.length === 1 ? 'produto' : 'produtos'} ({totalUnits} un)
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Peso estimado total: <span className="tabular-nums">{totalWeight}g</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141822] p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Condições de Pagamento
              </div>
              <div className="mt-1 text-xs font-bold leading-snug">
                {quote.paymentTerms ||
                  '50% de sinal na aprovação do pedido e 50% na entrega/envio.'}
              </div>
            </div>

            <div className="rounded-2xl bg-[#0D0F14] dark:bg-[#1D63FF] p-4 text-white">
              <div className="text-xs text-slate-300 dark:text-blue-100">
                Valor Total do Orçamento
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">
                {formatCurrencyBRL(quote.totalPrice)}
              </div>
              <div className="mt-1 text-xs text-slate-300 dark:text-blue-100 tabular-nums">
                {discount > 0 ? `Inclui desconto de ${formatCurrencyBRL(discount)}` : 'Valor final p/ cliente'}
              </div>
            </div>
          </div>

          {/* Products & Quantities Table */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Itens do Orçamento (Produtos & Quantidades)
            </h4>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produto 3D</th>
                    <th className="px-4 py-3 font-semibold">Código SKU</th>
                    <th className="px-4 py-3 text-right font-semibold">Qtd</th>
                    <th className="px-4 py-3 text-right font-semibold">Preço Un.</th>
                    <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#141822]">
                  {items.map((item, index) => (
                    <tr key={`${item.productId}_${index}`}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums">
                        {item.quantity} un
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatCurrencyBRL(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold tabular-nums">
                        {formatCurrencyBRL(item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotals / Discount / Shipping Breakdown */}
            <div className="mt-4 flex flex-col items-end space-y-1 text-xs">
              <div className="flex w-full max-w-xs justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal dos Produtos:</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatCurrencyBRL(subtotal)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex w-full max-w-xs justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Desconto Concedido:</span>
                  <span className="font-mono font-bold tabular-nums">
                    -{formatCurrencyBRL(discount)}
                  </span>
                </div>
              )}
              {shipping > 0 && (
                <div className="flex w-full max-w-xs justify-between text-slate-500 dark:text-slate-400">
                  <span>Frete / Entrega:</span>
                  <span className="font-mono font-bold tabular-nums">
                    +{formatCurrencyBRL(shipping)}
                  </span>
                </div>
              )}
              <div className="flex w-full max-w-xs justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Total do Orçamento:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrencyBRL(quote.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="mt-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141822] p-3.5 text-xs text-slate-600 dark:text-slate-300">
              <strong className="font-bold text-slate-900 dark:text-white">
                Observações da Proposta:
              </strong>{' '}
              {quote.notes}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Orçamento sujeito à disponibilidade de agenda de impressão na confirmação do pedido.
            </div>
            <div className="font-mono">PrintMais · Gestão & Precificação</div>
          </div>
        </div>

        {/* WhatsApp Preview Box when in PDF tab */}
        {activeTab === 'pdf' && (
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto Formatado para WhatsApp
              </span>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedWhatsApp ? 'Copiado!' : 'Copiar texto'}
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-600 dark:text-slate-300">
              {whatsappText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
