import { useState, useEffect } from 'react';
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

interface UseMarketDataProps {
  visiblePriceRange?: { min: number; max: number };
}

export function useMarketData({ visiblePriceRange }: UseMarketDataProps = {}) {
  const [data, setData] = useState<MarketData>({
    orderbook: {
      bids: [],
      asks: [],
      timestamp: ''
    },
    currentPrice: 0
  });

  const [volumeProfile, setVolumeProfile] = useState<Array<{
    price: number;
    volume: number;
    normalizedVolume: number;
    side: 'bid' | 'ask';
  }>>([]);

  const { socket, connectionState } = useSocketIO();

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
        // Procesar los datos del orderbook
        const bids = newData.bids.map(bid => ({
          price: parseFloat(bid.Price),
          volume: parseFloat(bid.Quantity),
          side: 'bid' as const
        }));

        const asks = newData.asks.map(ask => ({
          price: parseFloat(ask.Price),
          volume: parseFloat(ask.Quantity),
          side: 'ask' as const
        }));

        // Calcular el precio medio
        const midPrice = bids[0] && asks[0]
          ? (bids[0].price + asks[0].price) / 2
          : 0;

        setData(prev => ({
          ...prev,
          orderbook: newData,
          currentPrice: midPrice
        }));

        // Procesar y actualizar el perfil de volumen
        const allLevels = [...bids, ...asks];
        const maxVolume = Math.max(...allLevels.map(level => level.volume));

        const profileData = allLevels.map(level => ({
          price: level.price,
          volume: level.volume,
          normalizedVolume: maxVolume > 0 ? level.volume / maxVolume : 0,
          side: level.side
        }));

        console.log('Volume Profile Processed:', {
          levels: profileData.length,
          maxVolume,
          sampleData: profileData.slice(0, 3)
        });

        setVolumeProfile(profileData);

      } catch (err) {
        console.error('Error processing orderbook data:', err);
      }
    });

    return () => {
      socket.off('orderbook_update');
    };
  }, [socket]);

  return {
    data,
    volumeProfile,
    connectionState
  };
}