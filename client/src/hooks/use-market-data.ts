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
}

interface MarketData {
  orderbook: OrderbookData;
  currentPrice: number;
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    orderbook: {
      bids: [],
      asks: [],
      timestamp: ''
    },
    currentPrice: 0
  });

  const [error, setError] = useState(false);
  const { toast } = useToast();
  const { socket, connectionState } = useSocketIO();

  useEffect(() => {
    if (!socket) return;

    socket.on('orderbook_update', (newData: OrderbookData) => {
      try {
        setData(prev => ({
          ...prev,
          orderbook: newData,
          currentPrice: newData.bids[0] && newData.asks[0] 
            ? (parseFloat(newData.bids[0].Price) + parseFloat(newData.asks[0].Price)) / 2 
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

  // Calculate volume profile data from orderbook
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) return [];

    // Procesar bids y asks por separado
    const bids = data.orderbook.bids.map(bid => ({
      price: parseFloat(bid.Price),
      volume: parseFloat(bid.Quantity),
      side: 'bid' as const
    }));

    const asks = data.orderbook.asks.map(ask => ({
      price: parseFloat(ask.Price),
      volume: parseFloat(ask.Quantity),
      side: 'ask' as const
    }));

    // Combinar y ordenar por precio
    const allLevels = [...bids, ...asks].sort((a, b) => b.price - a.price);

    // Encontrar el volumen máximo para normalización
    const maxVolume = Math.max(...allLevels.map(level => level.volume));

    // Normalizar volúmenes y mantener el lado (bid/ask)
    const normalizedLevels = allLevels.map(level => ({
      ...level,
      volume: level.volume,
      normalizedVolume: level.volume / maxVolume
    }));

    console.log('📊 Volume Profile Data:', {
      bidsCount: bids.length,
      asksCount: asks.length,
      maxVolume,
      sampleData: normalizedLevels.slice(0, 3)
    });

    return normalizedLevels;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}