import { useEffect, useState } from 'react';

interface WebSocketOptions {
  onError?: () => void;
  enabled?: boolean;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }

    // Use relative URL to match the current protocol and host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.addEventListener('open', () => {
      console.log('WebSocket Conectado');
    });

    ws.addEventListener('error', (error) => {
      console.error('Error de WebSocket:', error);
      options.onError?.();
    });

    ws.addEventListener('close', () => {
      console.log('WebSocket Desconectado');
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [options.enabled]);

  return socket;
}