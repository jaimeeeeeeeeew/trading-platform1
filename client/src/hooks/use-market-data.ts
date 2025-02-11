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
      console.log('📊 Received orderbook data:', {
        timestamp: newData.timestamp,
        bids_count: newData.bids.length,
        asks_count: newData.asks.length
      });

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

  // Calculate volume profile data from orderbook with price buckets
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('No orderbook data available for volume profile');
      return [];
    }

    console.log('Processing orderbook data for volume profile:', {
      bids: data.orderbook.bids.length,
      asks: data.orderbook.asks.length
    });

    const PRICE_BUCKET_SIZE = 10; // Agrupar precios cada $10

    // Función para agrupar precios en buckets
    const getPriceBucket = (price: number) => 
      Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;

    // Objeto para acumular volúmenes por nivel de precio
    const volumeByPrice: Record<number, { volume: number; side: 'bid' | 'ask' }> = {};

    // Procesar bids
    data.orderbook.bids.forEach(bid => {
      const price = parseFloat(bid.Price);
      const volume = parseFloat(bid.Quantity);
      const bucket = getPriceBucket(price);

      if (!volumeByPrice[bucket]) {
        volumeByPrice[bucket] = { volume: 0, side: 'bid' };
      }
      volumeByPrice[bucket].volume += volume;
    });

    // Procesar asks
    data.orderbook.asks.forEach(ask => {
      const price = parseFloat(ask.Price);
      const volume = parseFloat(ask.Quantity);
      const bucket = getPriceBucket(price);

      if (!volumeByPrice[bucket]) {
        volumeByPrice[bucket] = { volume: 0, side: 'ask' };
      }
      volumeByPrice[bucket].volume += volume;
    });

    // Convertir a array y ordenar por precio
    const groupedLevels = Object.entries(volumeByPrice)
      .map(([price, data]) => ({
        price: parseFloat(price),
        volume: data.volume,
        side: data.side
      }))
      .sort((a, b) => b.price - a.price);

    if (groupedLevels.length === 0) {
      console.log('No grouped levels available');
      return [];
    }

    // Encontrar el volumen máximo para normalización
    const maxVolume = Math.max(...groupedLevels.map(level => level.volume));

    // Normalizar volúmenes
    const normalizedLevels = groupedLevels.map(level => ({
      ...level,
      normalizedVolume: level.volume / maxVolume
    }));

    console.log('📊 Volume Profile Data:', {
      levels: normalizedLevels.length,
      maxVolume,
      sampleData: normalizedLevels.slice(0, 3)
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