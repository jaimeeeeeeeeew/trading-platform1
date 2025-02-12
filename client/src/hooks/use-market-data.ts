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

  const { socket, connectionState } = useSocketIO({
    onProfileData: (profileData) => {
      if (!profileData.length) return;

      const maxVolume = Math.max(...profileData.map(item => item.volume));

      const normalizedData = profileData.map(item => ({
        ...item,
        normalizedVolume: maxVolume > 0 ? item.volume / maxVolume : 0
      }));

      console.log('📊 Received orderbook data:', {
        timestamp: new Date().toISOString(),
        bids_count: profileData.filter(d => d.side === 'bid').length,
        asks_count: profileData.filter(d => d.side === 'ask').length
      });

      console.log('📗 Top 5 Bids:');
      normalizedData
        .filter(d => d.side === 'bid')
        .slice(0, 5)
        .forEach(bid => {
          console.log(`   Price: ${bid.price}, Volume: ${bid.volume}`);
        });

      console.log('📕 Top 5 Asks:');
      normalizedData
        .filter(d => d.side === 'ask')
        .slice(0, 5)
        .forEach(ask => {
          console.log(`   Price: ${ask.price}, Volume: ${ask.volume}`);
        });

      setVolumeProfile(normalizedData);
    }
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('orderbook_update', (newData: OrderbookData) => {
      try {
        const bids = newData.bids.map(bid => ({
          price: parseFloat(bid.Price),
          volume: parseFloat(bid.Quantity)
        }));

        const asks = newData.asks.map(ask => ({
          price: parseFloat(ask.Price),
          volume: parseFloat(ask.Quantity)
        }));

        const midPrice = bids[0] && asks[0]
          ? (bids[0].price + asks[0].price) / 2
          : 0;

        setData(prev => ({
          ...prev,
          orderbook: newData,
          currentPrice: midPrice
        }));

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