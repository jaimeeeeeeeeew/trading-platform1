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

  // Calculate volume profile data from orderbook
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) return [];

    // Crear un mapa para acumular volúmenes por nivel de precio
    const volumeMap = new Map<number, { volume: number; side: 'bid' | 'ask' }>();

    // Procesar bids
    data.orderbook.bids.forEach(bid => {
      const price = Math.floor(parseFloat(bid.Price));
      const volume = parseFloat(bid.Quantity);
      const existing = volumeMap.get(price);
      if (existing) {
        existing.volume += volume;
      } else {
        volumeMap.set(price, { volume, side: 'bid' });
      }
    });

    // Procesar asks
    data.orderbook.asks.forEach(ask => {
      const price = Math.floor(parseFloat(ask.Price));
      const volume = parseFloat(ask.Quantity);
      const existing = volumeMap.get(price);
      if (existing) {
        existing.volume += volume;
      } else {
        volumeMap.set(price, { volume, side: 'ask' });
      }
    });

    // Convertir el mapa a un array y ordenar por precio
    const sortedEntries = Array.from(volumeMap.entries())
      .map(([price, { volume, side }]) => ({
        price,
        volume,
        side
      }))
      .sort((a, b) => b.price - a.price);

    console.log('📊 Volume profile calculated:', {
      levels: sortedEntries.length,
      maxVolume: Math.max(...sortedEntries.map(entry => entry.volume)),
      minPrice: Math.min(...sortedEntries.map(entry => entry.price)),
      maxPrice: Math.max(...sortedEntries.map(entry => entry.price))
    });

    return sortedEntries;
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}