import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useBinxData(symbol: string) {
  const queryClient = useQueryClient();

  const { data: marketData, error: marketError } = useQuery({
    queryKey: ['binx', 'market', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/binx/market-data/${encodeURIComponent(symbol)}`);
      if (!response.ok) {
        throw new Error('Error al obtener datos de mercado');
      }
      const data = await response.json();
      return {
        direccion: data.price || 0,
        dominancia: {
          left: data.buyVolume || 0,
          right: data.sellVolume || 0
        },
        delta_futuros: {
          positivo: data.futuresLongVolume || 0,
          negativo: data.futuresShortVolume || 0
        },
        delta_spot: {
          positivo: data.spotBuyVolume || 0,
          negativo: data.spotSellVolume || 0
        }
      };
    },
    refetchInterval: 1000 // Actualizar cada segundo
  });

  const { data: accountData, error: accountError } = useQuery({
    queryKey: ['binx', 'account'],
    queryFn: async () => {
      const response = await fetch('/api/binx/account');
      if (!response.ok) {
        throw new Error('Error al obtener información de la cuenta');
      }
      return response.json();
    },
    refetchInterval: 30000 // Actualizar cada 30 segundos
  });

  const { data: tradeHistory, error: tradeError } = useQuery({
    queryKey: ['binx', 'trades', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/binx/trades/${encodeURIComponent(symbol)}`);
      if (!response.ok) {
        throw new Error('Error al obtener historial de trades');
      }
      return response.json();
    },
    refetchInterval: 10000 // Actualizar cada 10 segundos
  });

  return {
    marketData,
    accountData,
    tradeHistory,
    error: marketError || accountError || tradeError
  };
}