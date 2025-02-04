import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OrderData {
  price: number;
  volume: number;
}

interface MarketData {
  limitAsks: OrderData[];
  limitBids: OrderData[];
  marketBuys: OrderData[];
  marketSells: OrderData[];
}

export function useMarketData() {
  const [data, setData] = useState<Record<string, MarketData> | undefined>(undefined);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const eventSource = new EventSource('/api/market-data');

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        setData(newData);
        setError(false);
      } catch (err) {
        console.error('Error al procesar datos:', err);
        setError(true);
        toast({
          variant: "destructive",
          title: "Error de datos",
          description: "Error al procesar los datos recibidos"
        });
      }
    };

    eventSource.onerror = () => {
      setError(true);
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar al servidor de datos en tiempo real"
      });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [toast]);

  return { data, error };
}