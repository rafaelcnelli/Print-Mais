import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'landing' | 'mobile-drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, suppress prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
      }
    } else {
      // Show guide modal for iOS or browsers waiting for user gesture
      setShowGuideModal(true);
    }
  };

  const renderButtonContent = () => {
    if (installSuccess) {
      return (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>App Instalado!</span>
        </>
      );
    }

    if (variant === 'landing') {
      return (
        <>
          <Download className="h-4 w-4" />
          <span>Instalar PrintMais no Dispositivo</span>
        </>
      );
    }

    if (variant === 'sidebar' || variant === 'mobile-drawer') {
      return (
        <>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 dark:bg-blue-500/10 text-[#1D63FF] shrink-0">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-xs font-extrabold truncate">Instalar PrintMais</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              Acesso rápido e offline
            </div>
          </div>
          <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#1D63FF] transition-colors" />
        </>
      );
    }

    return (
      <>
        <Download className="h-3.5 w-3.5" />
        <span>Instalar App</span>
      </>
    );
  };

  const getButtonClasses = () => {
    if (variant === 'landing') {
      return `inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#14171F] px-5 py-3 text-xs font-extrabold text-slate-900 dark:text-white shadow-sm hover:border-[#1D63FF] hover:text-[#1D63FF] transition-all cursor-pointer ${className}`;
    }

    if (variant === 'sidebar' || variant === 'mobile-drawer') {
      return `group flex w-full items-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#161923] p-3 text-slate-800 dark:text-slate-100 hover:border-[#1D63FF] transition-all cursor-pointer ${className}`;
    }

    // Default header pill
    return `inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-[#1D63FF] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-xs cursor-pointer ${className}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        data-testid="pwa-install-button"
        aria-label="Instalar PrintMais"
        title="Instale o PrintMais no seu celular ou computador para abrir em tela cheia e ter acesso rápido"
        className={getButtonClasses()}
      >
        {renderButtonContent()}
      </button>

      {/* Guided Instructions Modal for iOS / Safari / Desktop */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14171F] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1D63FF] text-white">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Instalar PrintMais
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aplicativo Web Progressivo (PWA)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <div className="space-y-2.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Como instalar no iPhone ou iPad:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <li>
                      Toque no ícone de <strong className="text-slate-900 dark:text-white">Compartilhar</strong> (ícone quadrado com seta) na barra do Safari.
                    </li>
                    <li>
                      Role a lista para baixo e toque em <strong className="text-slate-900 dark:text-white">"Adicionar à Tela de Início"</strong>.
                    </li>
                    <li>
                      Toque em <strong className="text-[#1D63FF]">Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Como instalar no Chrome, Edge ou Android:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <li>
                      Abra o menu do navegador (ícone de <strong className="text-slate-900 dark:text-white">3 pontinhos ⋮</strong>) no canto superior.
                    </li>
                    <li>
                      Selecione <strong className="text-slate-900 dark:text-white">"Instalar aplicativo"</strong> ou <strong className="text-slate-900 dark:text-white">"Adicionar à tela inicial"</strong>.
                    </li>
                    <li>
                      Confirme a instalação para usar o PrintMais como app nativo!
                    </li>
                  </ol>
                </div>
              )}

              <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 p-3 mt-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1D63FF] dark:text-blue-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Ícone oficial "Print / Mais"</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  O app abre em tela cheia com alta velocidade, modo escuro e salva seus cálculos diretamente no aparelho.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-full bg-[#1D63FF] py-2.5 text-xs font-extrabold text-white hover:bg-blue-600 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
