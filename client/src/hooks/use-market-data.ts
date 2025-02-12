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
  const { socket, connectionState, reconnect } = useSocketIO({
    enabled: true,
    onError: () => {
      setError(true);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Could not connect to data server"
      });
    }
  });

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
      }
    });

    return () => {
      socket.off('orderbook_update');
    };
  }, [socket, toast]);

  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      return [];
    }

    const PRICE_BUCKET_SIZE = 10;
    const volumeByPrice: Record<number, { volume: number; side: 'bid' | 'ask' }> = {};

    data.orderbook.bids.forEach(bid => {
      const price = parseFloat(bid.Price);
      const volume = parseFloat(bid.Quantity);
      const bucket = Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;

      if (!volumeByPrice[bucket]) {
        volumeByPrice[bucket] = { volume: 0, side: 'bid' };
      }
      volumeByPrice[bucket].volume += volume;
    });

    data.orderbook.asks.forEach(ask => {
      const price = parseFloat(ask.Price);
      const volume = parseFloat(ask.Quantity);
      const bucket = Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;

      if (!volumeByPrice[bucket]) {
        volumeByPrice[bucket] = { volume: 0, side: 'ask' };
      }
      volumeByPrice[bucket].volume += volume;
    });

    const groupedLevels = Object.entries(volumeByPrice)
      .map(([price, data]) => ({
        price: parseFloat(price),
        volume: data.volume,
        side: data.side
      }))
      .sort((a, b) => b.price - a.price);

    const maxVolume = Math.max(...groupedLevels.map(level => level.volume));

    return groupedLevels.map(level => ({
      ...level,
      normalizedVolume: level.volume / maxVolume
    }));
  }, [data.orderbook]);

  return { 
    data, 
    volumeProfile, 
    error,
    connectionState,
    reconnect
  };
}