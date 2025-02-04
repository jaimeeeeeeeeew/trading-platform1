import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MarketData {
  direccion: number;
  dominancia: { left: number; right: number };
  delta_futuros: { positivo: number; negativo: number };
  delta_spot: { positivo: number; negativo: number };
  transacciones: Array<{ volume: string; price: string }>;
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    direccion: 0,
    dominancia: { left: 0, right: 0 },
    delta_futuros: { positivo: 0, negativo: 0 },
    delta_spot: { positivo: 0, negativo: 0 },
    transacciones: []
  });
  const [error, setError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const eventSource = new EventSource('http://0.0.0.0:3001/api/market-data');

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