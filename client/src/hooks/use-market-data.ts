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

    // Amplificación similar a los datos simulados
    const VOLUME_MULTIPLIER = 100;

    // Procesar bids
    const bids = data.orderbook.bids.map(bid => ({
      price: Math.round(parseFloat(bid.Price)),
      volume: Math.round(parseFloat(bid.Quantity) * VOLUME_MULTIPLIER),
      side: 'bid' as const
    }));

    // Procesar asks
    const asks = data.orderbook.asks.map(ask => ({
      price: Math.round(parseFloat(ask.Price)),
      volume: Math.round(parseFloat(ask.Quantity) * VOLUME_MULTIPLIER),
      side: 'ask' as const
    }));

    // Combinar y ordenar por precio
    const combinedProfile = [...bids, ...asks]
      .filter(item => !isNaN(item.price) && !isNaN(item.volume))
      .sort((a, b) => b.price - a.price);

    console.log('📊 Volume Profile Data:', {
      bidsCount: bids.length,
      asksCount: asks.length,
      sampleVolumes: combinedProfile.slice(0, 3).map(x => x.volume),
      maxVolume: Math.max(...combinedProfile.map(x => x.volume))
    });

    return combinedProfile;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}