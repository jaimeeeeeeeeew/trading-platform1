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

    console.log('Setting up orderbook listeners...');

    const handleOrderbookUpdate = (newData: OrderbookData) => {
      console.log('📊 Received orderbook update:', {
        timestamp: newData.timestamp,
        bids_count: newData.bids.length,
        asks_count: newData.asks.length
      });

      try {
        setData(prev => {
          const midPrice = newData.bids[0] && newData.asks[0]
            ? (parseFloat(newData.bids[0].Price) + parseFloat(newData.asks[0].Price)) / 2
            : prev.currentPrice;

          console.log('Calculating new price:', {
            bestBid: newData.bids[0]?.Price,
            bestAsk: newData.asks[0]?.Price,
            midPrice
          });

          return {
            orderbook: newData,
            currentPrice: midPrice
          };
        });
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
    };

    socket.on('orderbook_update', handleOrderbookUpdate);

    return () => {
      socket.off('orderbook_update', handleOrderbookUpdate);
    };
  }, [socket, toast]);

  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) {
      console.log('No orderbook data for volume profile');
      return [];
    }

    const PRICE_BUCKET_SIZE = 10;
    const volumeByPrice: Record<number, { volume: number; side: 'bid' | 'ask' }> = {};

    // Procesar bids
    data.orderbook.bids.forEach(bid => {
      const price = Math.floor(parseFloat(bid.Price) / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;
      const volume = parseFloat(bid.Quantity);

      if (!volumeByPrice[price]) {
        volumeByPrice[price] = { volume: 0, side: 'bid' };
      }
      volumeByPrice[price].volume += volume;
    });

    // Procesar asks
    data.orderbook.asks.forEach(ask => {
      const price = Math.floor(parseFloat(ask.Price) / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;
      const volume = parseFloat(ask.Quantity);

      if (!volumeByPrice[price]) {
        volumeByPrice[price] = { volume: 0, side: 'ask' };
      }
      volumeByPrice[price].volume += volume;
    });

    const groupedLevels = Object.entries(volumeByPrice)
      .map(([price, data]) => ({
        price: parseFloat(price),
        volume: data.volume,
        side: data.side
      }))
      .sort((a, b) => b.price - a.price);

    console.log('Volume Profile calculation:', {
      levels: groupedLevels.length,
      sampleLevel: groupedLevels[0],
      timestamp: data.orderbook.timestamp
    });

    return groupedLevels;
  }, [data.orderbook]);

  return {
    data,
    volumeProfile,
    error,
    connectionState
  };
}