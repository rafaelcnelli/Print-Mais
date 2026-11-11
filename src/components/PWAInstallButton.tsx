import React, { useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed PWA in standalone mode, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'drawer' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          data-testid="pwa-install-btn-drawer"
          className="flex w-full items-center justify-between rounded-xl border border-[#1D63FF]/40 bg-[#1D63FF]/10 px-3.5 py-2.5 text-xs font-extrabold text-[#1D63FF] dark:text-blue-400 hover:bg-[#1D63FF] hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <Download className="h-4 w-4" />
            <span>{isIOS ? 'Instalar no iPhone / iPad' : 'Instalar App (PWA)'}</span>
          </span>
          <span className="rounded-full bg-[#1D63FF] px-2 py-0.5 text-[10px] font-bold text-white">
            App
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          data-testid="pwa-install-btn"
          title="Instalar aplicativo PrintMais no dispositivo"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#1D63FF]/40 bg-[#1D63FF]/10 hover:bg-[#1D63FF] px-3 py-1.5 text-xs font-extrabold text-[#1D63FF] dark:text-blue-400 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {isIOS ? 'Instalar no iOS' : 'Instalar App'}
          </span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-modal-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1D63FF]/15 text-[#1D63FF]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="pwa-guide-modal-title"
                    className="text-base font-extrabold text-slate-900 dark:text-white"
                  >
                    Instalar Aplicativo PrintMais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acesse direto da tela inicial com suporte offline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Fechar instruções de instalação"
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 dark:bg-[#0D0F14] border border-slate-200/70 dark:border-slate-800 p-4 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-[#1D63FF]" />
                  Como instalar no iPhone ou iPad (Safari):
                </p>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                  </li>
                  <li>
                    Role as opções para baixo e toque em{' '}
                    <strong>Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 dark:bg-[#0D0F14] border border-slate-200/70 dark:border-slate-800 p-4 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-bold text-slate-900 dark:text-white">
                  Como instalar no Android ou Computador (Chrome / Edge):
                </p>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Abra o PrintMais em uma aba direta do navegador (fora de janelas de pré-visualização).
                  </li>
                  <li>
                    Clique no ícone de <strong>Instalar PrintMais</strong> na barra de endereços ou no menu do navegador (<strong>⋮</strong> &rarr; <strong>Instalar aplicativo</strong>).
                  </li>
                  <li>
                    Confirme em <strong>Instalar</strong> para criar o atalho dedicado na sua tela inicial ou área de trabalho.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-full bg-[#1D63FF] py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Entendi, Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
