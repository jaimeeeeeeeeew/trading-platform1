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
        console.log('📊 Received orderbook update:', {
          timestamp: newData.timestamp,
          bidsCount: newData.bids.length,
          asksCount: newData.asks.length,
          topBid: newData.bids[0],
          topAsk: newData.asks[0]
        });

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

  // Calculate volume profile data from orderbook with additional debugging
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('⚠️ No orderbook data available for volume profile');
      return [];
    }

    console.log('📊 Processing orderbook data for volume profile:', {
      bids: data.orderbook.bids.length,
      asks: data.orderbook.asks.length,
      sampleBid: data.orderbook.bids[0],
      sampleAsk: data.orderbook.asks[0]
    });

    // Create a price-volume map for aggregation
    const volumeMap = new Map<number, { volume: number; side: 'bid' | 'ask' }>();

    // Process bids with price normalization
    data.orderbook.bids.forEach(bid => {
      const price = Math.round(parseFloat(bid.Price));
      const volume = parseFloat(bid.Quantity);

      if (!isNaN(price) && !isNaN(volume)) {
        const existing = volumeMap.get(price);
        if (existing) {
          existing.volume += volume;
        } else {
          volumeMap.set(price, { volume, side: 'bid' });
        }
      }
    });

    // Process asks with price normalization
    data.orderbook.asks.forEach(ask => {
      const price = Math.round(parseFloat(ask.Price));
      const volume = parseFloat(ask.Quantity);

      if (!isNaN(price) && !isNaN(volume)) {
        const existing = volumeMap.get(price);
        if (existing) {
          existing.volume += volume;
        } else {
          volumeMap.set(price, { volume, side: 'ask' });
        }
      }
    });

    // Convert map to array and sort by price
    const sortedEntries = Array.from(volumeMap.entries())
      .map(([price, { volume, side }]) => ({
        price,
        volume,
        side
      }))
      .sort((a, b) => b.price - a.price);

    console.log('📊 Volume profile generated:', {
      entries: sortedEntries.length,
      maxVolume: Math.max(...sortedEntries.map(entry => entry.volume)),
      minVolume: Math.min(...sortedEntries.map(entry => entry.volume)),
      sampleEntry: sortedEntries[0]
    });

    return sortedEntries;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}