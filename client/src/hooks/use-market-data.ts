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

    console.log('📊 Processing orderbook data:', {
      bids: data.orderbook.bids.length,
      asks: data.orderbook.asks.length
    });

    // Separate bids and asks processing for better volume balance
    const bidVolumes = new Map<number, number>();
    const askVolumes = new Map<number, number>();

    // Process bids
    data.orderbook.bids.forEach(bid => {
      const price = Math.round(parseFloat(bid.Price));
      const volume = parseFloat(bid.Quantity);
      if (!isNaN(price) && !isNaN(volume)) {
        bidVolumes.set(price, (bidVolumes.get(price) || 0) + volume);
      }
    });

    // Process asks
    data.orderbook.asks.forEach(ask => {
      const price = Math.round(parseFloat(ask.Price));
      const volume = parseFloat(ask.Quantity);
      if (!isNaN(price) && !isNaN(volume)) {
        askVolumes.set(price, (askVolumes.get(price) || 0) + volume);
      }
    });

    // Find max volumes for normalization
    const maxBidVolume = Math.max(...Array.from(bidVolumes.values()));
    const maxAskVolume = Math.max(...Array.from(askVolumes.values()));
    const maxVolume = Math.max(maxBidVolume, maxAskVolume);

    console.log('📊 Volume ranges:', {
      maxBidVolume,
      maxAskVolume,
      totalMaxVolume: maxVolume
    });

    // Amplify the volumes to make them more visible
    const volumeMultiplier = 1000; // Multiplicador para hacer los volúmenes más visibles

    // Combine and normalize volumes
    const normalizedProfile = [
      ...Array.from(bidVolumes.entries()).map(([price, volume]) => ({
        price,
        volume: (volume / maxVolume) * volumeMultiplier, // Amplificar el volumen
        side: 'bid' as const
      })),
      ...Array.from(askVolumes.entries()).map(([price, volume]) => ({
        price,
        volume: (volume / maxVolume) * volumeMultiplier, // Amplificar el volumen
        side: 'ask' as const
      }))
    ];

    const sortedProfile = normalizedProfile.sort((a, b) => b.price - a.price);

    console.log('📊 Generated volume profile:', {
      entries: sortedProfile.length,
      sampleBids: sortedProfile.filter(x => x.side === 'bid').slice(0, 3),
      sampleAsks: sortedProfile.filter(x => x.side === 'ask').slice(0, 3)
    });

    return sortedProfile;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}