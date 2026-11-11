import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      data-testid="pwa-offline-banner"
      className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-xl"
    >
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
      <WifiOff className="h-3.5 w-3.5" />
      <span>Modo Offline — Dados em cache estão sendo utilizados.</span>
    </div>
  );
};
