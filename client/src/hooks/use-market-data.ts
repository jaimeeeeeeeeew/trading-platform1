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
  // Campos simulados
  direccion: number;
  dominancia: { left: number; right: number };
  delta_futuros: { positivo: number; negativo: number };
  delta_spot: { positivo: number; negativo: number };
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    orderbook: {
      bids: [],
      asks: [],
      timestamp: ''
    },
    currentPrice: 0,
    // Valores simulados iniciales
    direccion: 45,
    dominancia: { left: 60, right: 40 },
    delta_futuros: { positivo: 75, negativo: 25 },
    delta_spot: { positivo: 55, negativo: 45 }
  });

  const [error, setError] = useState(false);
  const { toast } = useToast();
  const { socket, connectionState } = useSocketIO();

  // Actualizar datos simulados periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        direccion: Math.floor(Math.random() * 100),
        dominancia: {
          left: Math.floor(40 + Math.random() * 30),
          right: Math.floor(40 + Math.random() * 30)
        },
        delta_futuros: {
          positivo: Math.floor(50 + Math.random() * 30),
          negativo: Math.floor(50 + Math.random() * 30)
        },
        delta_spot: {
          positivo: Math.floor(50 + Math.random() * 30),
          negativo: Math.floor(50 + Math.random() * 30)
        }
      }));
    }, 2000); // Actualizar cada 2 segundos

    return () => clearInterval(interval);
  }, []);

  // Escuchar actualizaciones del orderbook
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

  // Calcular datos del perfil de volumen desde el orderbook
  const volumeProfile = useMemo(() => {
    if (!data.orderbook.bids.length && !data.orderbook.asks.length) return [];

    const allLevels = [
      ...data.orderbook.bids.map(bid => ({
        price: parseFloat(bid.Price),
        volume: parseFloat(bid.Quantity),
        side: 'bid' as const
      })),
      ...data.orderbook.asks.map(ask => ({
        price: parseFloat(ask.Price),
        volume: parseFloat(ask.Quantity),
        side: 'ask' as const
      }))
    ];

    // Agrupar por nivel de precio y sumar volúmenes
    const groupedVolumes = allLevels.reduce((acc, { price, volume, side }) => {
      const existing = acc.find(x => x.price === price);
      if (existing) {
        existing.volume += volume;
      } else {
        acc.push({ price, volume, side });
      }
      return acc;
    }, [] as Array<{ price: number; volume: number; side: 'bid' | 'ask' }>);

    return groupedVolumes.sort((a, b) => b.price - a.price);
  }, [data.orderbook]);

  return { data, volumeProfile, error, connectionState };
}