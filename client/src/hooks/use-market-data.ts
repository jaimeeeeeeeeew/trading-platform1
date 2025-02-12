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

export function useMarketData() {
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

        // Combinar y ordenar los niveles de precio
        const allLevels = [...bids, ...asks].sort((a, b) => b.price - a.price);

        // Calcular el volumen máximo para normalización
        const maxVolume = Math.max(...allLevels.map(level => level.volume));

        // Crear el perfil de volumen normalizado
        const profileData = allLevels.map(level => ({
          ...level,
          normalizedVolume: maxVolume > 0 ? level.volume / maxVolume : 0
        }));

        console.log('Volume Profile Generated:', {
          levels: profileData.length,
          maxVolume,
          sampleBids: profileData.filter(d => d.side === 'bid').slice(0, 3),
          sampleAsks: profileData.filter(d => d.side === 'ask').slice(0, 3)
        });

        setData(prev => ({
          ...prev,
          orderbook: newData,
          currentPrice: midPrice
        }));

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