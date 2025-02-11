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

const PRICE_BUCKET_SIZE = 10; // Agrupar cada $10

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
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

    // Función para redondear el precio al bucket más cercano
    const roundToBucket = (price: number) => {
      return Math.round(price / PRICE_BUCKET_SIZE) * PRICE_BUCKET_SIZE;
    };

    // Crear un mapa para acumular volúmenes por nivel de precio
    const volumeMap = new Map<number, number>();

    // Procesar bids
    data.orderbook.bids.forEach(bid => {
      const price = roundToBucket(parseFloat(bid.Price));
      const volume = parseFloat(bid.Quantity);
      volumeMap.set(price, (volumeMap.get(price) || 0) + volume);
    });

    // Procesar asks
    data.orderbook.asks.forEach(ask => {
      const price = roundToBucket(parseFloat(ask.Price));
      const volume = parseFloat(ask.Quantity);
      volumeMap.set(price, (volumeMap.get(price) || 0) + volume);
    });

    // Convertir el mapa a un array ordenado
    const result = Array.from(volumeMap.entries()).map(([price, volume]) => ({
      price,
      volume,
      side: price >= data.currentPrice ? 'ask' as const : 'bid' as const
    }));

    return result.sort((a, b) => b.price - a.price);
  }, [data.orderbook, data.currentPrice]);

  return { data, volumeProfile, error, connectionState };
}