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
      // Use relative URL to match the current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.addEventListener('open', () => {
        console.log('WebSocket Conectado');
        setAttempts(0); // Reset attempts on successful connection
      });

      ws.addEventListener('error', (error) => {
        console.error('Error de WebSocket:', error);
        if (attempts < retryAttempts) {
          timeoutId = setTimeout(() => {
            setAttempts(prev => prev + 1);
            connect();
          }, retryDelay);
        } else {
          onError?.();
        }
      });

      ws.addEventListener('close', () => {
        console.log('WebSocket Desconectado');
        if (attempts < retryAttempts) {
          timeoutId = setTimeout(() => {
            setAttempts(prev => prev + 1);
            connect();
          }, retryDelay);
        }
      });

      setSocket(ws);
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