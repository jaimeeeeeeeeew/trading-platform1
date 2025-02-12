import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

interface UseSocketOptions {
  enabled?: boolean;
  onError?: () => void;
  onProfileData?: (data: Array<{ price: number; volume: number; side: 'bid' | 'ask' }>) => void;
  onPriceUpdate?: (price: number) => void;
}

export function useSocketIO({
  enabled = true,
  onError,
  onProfileData,
  onPriceUpdate
}: UseSocketOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    const cleanup = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

    const initializeSocket = () => {
      console.log('🎧 Initializing socket connection...');
      setConnectionState('connecting');

      cleanup();

      const socket = io(window.location.origin, {
        path: '/trading-socket',
        transports: ['websocket'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        forceNew: true
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🟢 Connected to server');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
      });

      socket.on('disconnect', (reason) => {
        console.log('🔴 Disconnected from server:', reason);
        setConnectionState('disconnected');

        if (reason === 'io server disconnect') {
          // Si el servidor desconectó intencionalmente, reconectar manualmente
          socket.connect();
        }
      });

      socket.on('error', (error) => {
        console.error('❌ Socket Error:', error);
        handleError();
      });

      socket.on('connect_error', (error) => {
        console.log('⚠️ Connection error:', error.message);
        handleError();
      });

      socket.on('orderbook_update', (data) => {
        try {
          if (onProfileData) {
            const bids = data.bids.map((bid: any) => ({
              price: parseFloat(bid.Price),
              volume: parseFloat(bid.Quantity),
              side: 'bid' as const
            }));

            const asks = data.asks.map((ask: any) => ({
              price: parseFloat(ask.Price),
              volume: parseFloat(ask.Quantity),
              side: 'ask' as const
            }));

            const midPrice = (parseFloat(data.bids[0]?.Price || '0') + parseFloat(data.asks[0]?.Price || '0')) / 2;
            if (midPrice && onPriceUpdate) {
              onPriceUpdate(midPrice);
            }

            onProfileData([...bids, ...asks]);
          }
        } catch (error) {
          console.error('Error processing orderbook update:', error);
        }
      });
    };

    const handleError = () => {
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('🔄 Max reconnection attempts reached, stopping...');
        cleanup();
        setConnectionState('error');
        onError?.();
      } else {
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        setConnectionState('connecting');

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          initializeSocket();
        }, delay);
      }
    };

    initializeSocket();

    return cleanup;
  }, [enabled, onError, onProfileData, onPriceUpdate]);

  const reconnect = () => {
    reconnectAttempts.current = 0;
    if (socketRef.current) {
      console.log('🔄 Forcing reconnection...');
      socketRef.current.connect();
    }
  };

  return {
    connectionState,
    socket: socketRef.current,
    reconnect
  };
}