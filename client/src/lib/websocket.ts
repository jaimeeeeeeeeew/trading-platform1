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
    let timeoutId: NodeJS.Timeout;

    const connect = () => {
      try {
        // Usar la URL relativa para coincidir con el protocolo actual
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        ws = new WebSocket(wsUrl);

        ws.addEventListener('open', () => {
          console.log('WebSocket Conectado');
          setAttempts(0);
          setSocket(ws);
        });

        ws.addEventListener('error', (error) => {
          console.error('Error de WebSocket:', error);
          if (attempts < retryAttempts) {
            timeoutId = setTimeout(() => {
              setAttempts(prev => prev + 1);
              connect();
            }, retryDelay * Math.pow(2, attempts)); // Exponential backoff
          } else {
            onError?.();
          }
        });

        ws.addEventListener('close', () => {
          console.log('WebSocket Desconectado');
          setSocket(null);
          if (attempts < retryAttempts) {
            timeoutId = setTimeout(() => {
              setAttempts(prev => prev + 1);
              connect();
            }, retryDelay * Math.pow(2, attempts)); // Exponential backoff
          }
        });
      } catch (error) {
        console.error('Error al crear WebSocket:', error);
        onError?.();
      }
    };

    connect();

    return () => {
      clearTimeout(timeoutId);
      if (ws) {
        ws.close();
      }
    };
  }, [enabled, attempts, retryAttempts, retryDelay, onError]);

  return socket;
}