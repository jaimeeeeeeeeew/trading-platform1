import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MarketData {
  direccion: number;
  dominancia: { left: number; right: number };
  delta_futuros: { positivo: number; negativo: number };
  delta_spot: { positivo: number; negativo: number };
  ask_limit: string;
  bid_limit: string;
  buy_market: string;
  sell_market: string;
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>({
    direccion: 0,
    dominancia: { left: 0, right: 0 },
    delta_futuros: { positivo: 0, negativo: 0 },
    delta_spot: { positivo: 0, negativo: 0 },
    ask_limit: "0",
    bid_limit: "0",
    buy_market: "0",
    sell_market: "0"
  });
  const [error, setError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      // Conectar al puerto específico del WebSocket
      ws = new WebSocket(`ws://${window.location.hostname}:8080`);

      ws.onmessage = (event) => {
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

      ws.onclose = () => {
        setError(true);
        // Intentar reconectar después de 3 segundos
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setError(true);
        toast({
          variant: "destructive",
          title: "Error de conexión",
          description: "Error en la conexión WebSocket"
        });
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [toast]);

  return { data, error };
}