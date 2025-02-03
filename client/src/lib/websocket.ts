import { useEffect, useState } from 'react';

interface WebSocketOptions {
  onError?: () => void;
  enabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export function useWebSocket({
  onError,
  enabled = true,
  retryAttempts = 3,
  retryDelay = 1000
}: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        // Asegurarnos de usar la misma base URL que el navegador
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log('Intentando conectar a:', wsUrl);

        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('WebSocket Conectado');
          setAttempts(0);
          setSocket(ws);
        });

        ws.addEventListener('close', () => {
          console.log('WebSocket Desconectado');
          setSocket(null);

          if (attempts < retryAttempts) {
            console.log(`Reintentando conexión en ${retryDelay}ms (intento ${attempts + 1}/${retryAttempts})`);
            reconnectTimeout = setTimeout(() => {
              setAttempts(prev => prev + 1);
              connect();
            }, retryDelay);
          } else {
            console.log('Máximo de intentos alcanzado');
            onError?.();
          }
        });

        ws.addEventListener('error', (error) => {
          console.error('Error de WebSocket:', error);
        });

        // Mantener la conexión viva respondiendo a pings
        ws.addEventListener('ping', () => {
          if (ws?.readyState === WebSocket.OPEN) {
            try {
              ws.send('pong');
            } catch (error) {
              console.error('Error al enviar pong:', error);
            }
          }
        });

      } catch (error) {
        console.error('Error al crear WebSocket:', error);
        onError?.();
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [enabled, attempts, retryAttempts, retryDelay, onError]);

  return socket;
}