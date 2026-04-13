import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * GlobalLoadingBar - Indicateur de chargement global
 * S'affiche automatiquement quand des requêtes TanStack Query sont en cours
 */
export const GlobalLoadingBar: React.FC = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 animate-loading-bar"
        style={{
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
};

export default GlobalLoadingBar;
