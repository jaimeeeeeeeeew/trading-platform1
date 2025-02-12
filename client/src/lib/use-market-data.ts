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

        // Ordenar bids de mayor a menor precio
        const sortedBids = [...newData.bids].sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
        // Ordenar asks de menor a mayor precio
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
            bids: sortedBids.slice(0, 100),
            asks: sortedAsks.slice(0, 100),
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

    const PRICE_BUCKET_SIZE = 10;

    // Función para agrupar precios en buckets
    const getPriceBucket = (price: number) => 
      Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;

    // Procesar bids y asks por separado
    const bidVolumes: Record<number, { volume: number; side: 'bid' }> = {};
    const askVolumes: Record<number, { volume: number; side: 'ask' }> = {};

    // Procesar bids - mantener el lado 'bid' independientemente del volumen
    data.orderbook.bids.forEach(bid => {
      const price = parseFloat(bid.Price);
      const volume = parseFloat(bid.Quantity);
      const bucket = getPriceBucket(price);

      if (!bidVolumes[bucket]) {
        bidVolumes[bucket] = { volume: 0, side: 'bid' };
      }
      bidVolumes[bucket].volume += volume;
    });

    // Procesar asks - mantener el lado 'ask' independientemente del volumen
    data.orderbook.asks.forEach(ask => {
      const price = parseFloat(ask.Price);
      const volume = parseFloat(ask.Quantity);
      const bucket = getPriceBucket(price);

      if (!askVolumes[bucket]) {
        askVolumes[bucket] = { volume: 0, side: 'ask' };
      }
      askVolumes[bucket].volume += volume;
    });

    // Combinar los volúmenes manteniendo la separación de sides
    const allLevels = [
      ...Object.entries(bidVolumes).map(([price, data]) => ({
        price: Number(price),
        volume: data.volume,
        side: data.side
      })),
      ...Object.entries(askVolumes).map(([price, data]) => ({
        price: Number(price),
        volume: data.volume,
        side: data.side
      }))
    ];

    // Encontrar el volumen máximo para normalización
    const maxVolume = Math.max(...allLevels.map(level => level.volume));

    // Normalizar volúmenes manteniendo los sides originales
    const normalizedLevels = allLevels.map(level => ({
      ...level,
      normalizedVolume: level.volume / maxVolume
    })).sort((a, b) => b.price - a.price);

    console.log('📊 Volume Profile Updated:', {
      levels: normalizedLevels.length,
      maxVolume,
      bidLevels: normalizedLevels.filter(v => v.side === 'bid').length,
      askLevels: normalizedLevels.filter(v => v.side === 'ask').length
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