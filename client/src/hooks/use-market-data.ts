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
  const { socket, connectionState, reconnect } = useSocketIO();

  useEffect(() => {
    if (!socket) return;

    console.log('Setting up orderbook listeners...');

    socket.on('orderbook_update', (newData: OrderbookData) => {
      console.log('📊 Received orderbook update:', {
        timestamp: newData.timestamp,
        bids_count: newData.bids.length,
        asks_count: newData.asks.length,
        first_bid: newData.bids[0],
        first_ask: newData.asks[0]
      });

      try {
        if (!Array.isArray(newData.bids) || !Array.isArray(newData.asks)) {
          throw new Error('Invalid orderbook data structure');
        }

        const sortedBids = [...newData.bids].sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
        const sortedAsks = [...newData.asks].sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));

        console.log('📗 Top 5 Bids:', sortedBids.slice(0, 5).map(bid => ({
          Price: parseFloat(bid.Price),
          Volume: parseFloat(bid.Quantity)
        })));

        console.log('📕 Top 5 Asks:', sortedAsks.slice(0, 5).map(ask => ({
          Price: parseFloat(ask.Price),
          Volume: parseFloat(ask.Quantity)
        })));

        setData(prev => ({
          ...prev,
          orderbook: {
            bids: sortedBids,
            asks: sortedAsks,
            timestamp: newData.timestamp
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

    // Procesar bids y asks directamente sin agrupación
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

    // Ordenar por precio de mayor a menor
    allLevels.sort((a, b) => b.price - a.price);

    // Encontrar el volumen máximo para normalización
    const maxVolume = Math.max(...allLevels.map(level => level.volume));

    // Normalizar volúmenes
    const normalizedLevels = allLevels.map(level => ({
      ...level,
      normalizedVolume: level.volume / maxVolume
    }));

    console.log('📊 Volume Profile Data:', {
      levels: normalizedLevels.length,
      bidLevels: normalizedLevels.filter(v => v.side === 'bid').length,
      askLevels: normalizedLevels.filter(v => v.side === 'ask').length,
      sampleBid: normalizedLevels.find(v => v.side === 'bid'),
      sampleAsk: normalizedLevels.find(v => v.side === 'ask')
    });

    return normalizedLevels;
  }, [data.orderbook]);

  return { 
    data, 
    volumeProfile, 
    error, 
    connectionState,
    reconnect 
  };
}