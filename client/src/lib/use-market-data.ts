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
        // Validar que los datos sean arrays antes de procesarlos
        if (!Array.isArray(newData.bids) || !Array.isArray(newData.asks)) {
          throw new Error('Invalid orderbook data structure');
        }

        // Ordenar bids de mayor a menor precio
        const sortedBids = [...newData.bids].sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
        // Ordenar asks de menor a mayor precio
        const sortedAsks = [...newData.asks].sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));

        setData(prev => ({
          ...prev,
          orderbook: {
            bids: sortedBids.slice(0, 100), // Limitar a 100 niveles para mejor rendimiento
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

  // Calculate volume profile data from orderbook with price buckets
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('No orderbook data available for volume profile');
      return [];
    }

    const PRICE_BUCKET_SIZE = 10; // Agrupar precios cada $10

    // Función para agrupar precios en buckets
    const getPriceBucket = (price: number) => 
      Math.floor(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;

    // Procesar bids y asks por separado para mantener la información del lado
    const bidVolumes: Record<number, number> = {};
    const askVolumes: Record<number, number> = {};

    // Procesar bids
    data.orderbook.bids.forEach(bid => {
      const price = parseFloat(bid.Price);
      const volume = parseFloat(bid.Quantity);
      const bucket = getPriceBucket(price);

      if (!bidVolumes[bucket]) {
        bidVolumes[bucket] = 0;
      }
      bidVolumes[bucket] += volume;
    });

    // Procesar asks
    data.orderbook.asks.forEach(ask => {
      const price = parseFloat(ask.Price);
      const volume = parseFloat(ask.Quantity);
      const bucket = getPriceBucket(price);

      if (!askVolumes[bucket]) {
        askVolumes[bucket] = 0;
      }
      askVolumes[bucket] += volume;
    });

    // Combinar y normalizar los volúmenes
    const allPrices = Array.from(new Set([
      ...Object.keys(bidVolumes).map(Number),
      ...Object.keys(askVolumes).map(Number)
    ])).sort((a, b) => b - a); // Ordenar precios de mayor a menor

    const volumes = allPrices.map(price => ({
      price,
      bidVolume: bidVolumes[price] || 0,
      askVolume: askVolumes[price] || 0,
      // Asignar el lado según el volumen dominante
      side: bidVolumes[price] > (askVolumes[price] || 0) ? 'bid' as const : 'ask' as const
    }));

    // Encontrar el volumen máximo para normalización
    const maxVolume = Math.max(
      ...volumes.map(v => Math.max(v.bidVolume, v.askVolume))
    );

    // Normalizar volúmenes
    const normalizedVolumes = volumes.map(v => ({
      ...v,
      normalizedBidVolume: v.bidVolume / maxVolume,
      normalizedAskVolume: v.askVolume / maxVolume,
      volume: v.side === 'bid' ? v.bidVolume : v.askVolume,
      normalizedVolume: v.side === 'bid' ? v.bidVolume / maxVolume : v.askVolume / maxVolume
    }));

    console.log('📊 Volume Profile Updated:', {
      levels: normalizedVolumes.length,
      maxVolume,
      firstBid: normalizedVolumes.find(v => v.side === 'bid'),
      firstAsk: normalizedVolumes.find(v => v.side === 'ask')
    });

    return normalizedVolumes;
  }, [data.orderbook]);

  return { 
    data, 
    volumeProfile, 
    error, 
    connectionState,
    reconnect 
  };
}