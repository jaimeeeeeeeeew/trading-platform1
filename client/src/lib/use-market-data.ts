import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MarketData {
  direccion: number;
  dominancia: { left: number; right: number };
  delta_futuros: number;
  delta_spot: number;
  transacciones: Array<{ volume: string; price: string }>;
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    direccion: 0,
    dominancia: { left: 0, right: 0 },
    delta_futuros: 0,
    delta_spot: 0,
    transacciones: []
  });
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
