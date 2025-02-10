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

    // Listen for orderbook updates
    socket.on('orderbook_update', (newData: OrderbookData) => {
      try {
        setData(prev => ({
          ...prev,
          orderbook: newData,
          // Calculate current price as mid-price between best bid and best ask
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

    const allLevels = [
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

    // Group by price level and sum volumes
    const groupedVolumes = allLevels.reduce((acc, { price, volume, side }) => {
      const existing = acc.find(x => x.price === price);
      if (existing) {
        existing.volume += volume;
      } else {
        acc.push({ price, volume, side });
      }
      return acc;
    }, [] as Array<{ price: number; volume: number; side: 'bid' | 'ask' }>);

    return groupedVolumes.sort((a, b) => b.price - a.price);
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}
