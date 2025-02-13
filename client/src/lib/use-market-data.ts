import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSocketIO } from '@/hooks/use-socket-io';

interface OrderbookData {
  bids: Array<{
    Price: string;
    Quantity: string;
  }>;
  asks: Array<{
    Price: string;
    Quantity: string;
  }>;
  timestamp: string;
  bidsTotalInRange: number;     // Total de bids en la distancia definida
  asksTotalInRange: number;     // Total de asks en la distancia definida
  futuresLongDeltas: number;    // Deltas futuros en largo
  futuresShortDeltas: number;   // Deltas futuros en corto
  spotLongDeltas: number;       // Deltas largos en spot
  spotShortDeltas: number;      // Deltas cortos en spot
  dominancePercentage: number;  // Porcentaje de dominancia actual
  btcAmount: number;            // Monto de BTC sin decimales
}

interface MarketData {
  orderbook: OrderbookData;
  currentPrice: number;
  dominanceRange: number;      // Porcentaje para el cálculo de dominancia (ej: 5%)
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    orderbook: {
      bids: [],
      asks: [],
      timestamp: '',
      bidsTotalInRange: 0,
      asksTotalInRange: 0,
      futuresLongDeltas: 0,
      futuresShortDeltas: 0,
      spotLongDeltas: 0,
      spotShortDeltas: 0,
      dominancePercentage: 50, // 50% es neutral
      btcAmount: 0
    },
    currentPrice: 0,
    dominanceRange: 5 // 5% por defecto
  });

  const [error, setError] = useState(false);
  const { toast } = useToast();
  const { socket, connectionState, reconnect } = useSocketIO();

  // Función para actualizar el rango de dominancia
  const setDominanceRange = (newRange: number) => {
    setData(prev => ({
      ...prev,
      dominanceRange: newRange
    }));
  };

  useEffect(() => {
    if (!socket) return;

    console.log('Setting up orderbook listeners...');

    socket.on('orderbook_update', (newData: OrderbookData) => {
      console.log('📊 Received orderbook update:', {
        timestamp: newData.timestamp,
        bids_count: newData.bids.length,
        asks_count: newData.asks.length,
        first_bid: newData.bids[0],
        first_ask: newData.asks[0],
        dominance: newData.dominancePercentage,
        btc_amount: newData.btcAmount
      });

      try {
        if (!Array.isArray(newData.bids) || !Array.isArray(newData.asks)) {
          throw new Error('Invalid orderbook data structure');
        }

        const sortedBids = [...newData.bids].sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
        const sortedAsks = [...newData.asks].sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));

        console.log('📗 Dominance Stats:', {
          bidsTotalInRange: newData.bidsTotalInRange,
          asksTotalInRange: newData.asksTotalInRange,
          dominancePercentage: newData.dominancePercentage,
          btcAmount: newData.btcAmount
        });

        setData(prev => ({
          ...prev,
          orderbook: {
            ...newData,
            bids: sortedBids,
            asks: sortedAsks
          },
          currentPrice: sortedBids[0] && sortedAsks[0]
            ? (parseFloat(sortedBids[0].Price) + parseFloat(sortedAsks[0].Price)) / 2
            : prev.currentPrice
        }));
        setError(false);
      } catch (err) {
        console.error('Error processing orderbook data:', err);
        setError(true);
        toast({
          variant: "destructive",
          title: "Error de datos",
          description: "Error al procesar los datos del orderbook"
        });
      }
    });

    return () => {
      socket.off('orderbook_update');
    };
  }, [socket, toast]);

  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('No orderbook data available for volume profile');
      return [];
    }

    const allLevels: Array<{ price: number; volume: number; side: 'bid' | 'ask' }> = [
      ...data.orderbook.bids.map(bid => ({
        price: parseFloat(bid.Price),
        volume: parseFloat(bid.Quantity),
        side: 'bid' as const
      })),
      ...data.orderbook.asks.map(ask => ({
        price: parseFloat(ask.Price),
        volume: parseFloat(ask.Quantity),
        side: 'ask' as const
      }))
    ];

    allLevels.sort((a, b) => b.price - a.price);

    const maxVolume = Math.max(...allLevels.map(level => level.volume));

    const normalizedLevels = allLevels.map(level => ({
      ...level,
      normalizedVolume: level.volume / maxVolume
    }));

    return normalizedLevels;
  }, [data.orderbook]);

  return {
    data,
    volumeProfile,
    error,
    connectionState,
    reconnect,
    setDominanceRange
  };
}