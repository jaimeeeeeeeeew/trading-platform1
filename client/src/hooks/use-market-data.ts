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

  // Calculate volume profile data from orderbook with improved volume normalization
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('⚠️ No orderbook data available for volume profile');
      return [];
    }

    // Amplification factor similar to simulated data
    const VOLUME_MULTIPLIER = 10000;

    // Process bids and asks separately
    const processOrders = (orders: Array<{ Price: string; Quantity: string }>, side: 'bid' | 'ask') => {
      return orders.map(order => {
        const price = Math.round(parseFloat(order.Price));
        const volume = parseFloat(order.Quantity) * VOLUME_MULTIPLIER; // Amplify volume
        return { price, volume, side };
      }).filter(order => !isNaN(order.price) && !isNaN(order.volume));
    };

    // Process both sides
    const bidEntries = processOrders(data.orderbook.bids, 'bid');
    const askEntries = processOrders(data.orderbook.asks, 'ask');

    // Combine and sort
    const combinedProfile = [...bidEntries, ...askEntries]
      .sort((a, b) => b.price - a.price);

    console.log('📊 Volume Profile Debug:', {
      totalEntries: combinedProfile.length,
      sampleBids: combinedProfile.filter(x => x.side === 'bid').slice(0, 3),
      sampleAsks: combinedProfile.filter(x => x.side === 'ask').slice(0, 3),
      volumeRange: {
        max: Math.max(...combinedProfile.map(x => x.volume)),
        min: Math.min(...combinedProfile.map(x => x.volume))
      }
    });

    return combinedProfile;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}