import { useEffect, useState } from 'react';

interface WebSocketOptions {
  onError?: () => void;
}

export function useWebSocket(options: WebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Use relative URL to match the current protocol and host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.addEventListener('open', () => {
      console.log('WebSocket Connected');
    });

    ws.addEventListener('error', (error) => {
      console.error('WebSocket Error:', error);
      options.onError?.();
    });

    ws.addEventListener('close', () => {
      console.log('WebSocket Disconnected');
    });

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  return socket;
}