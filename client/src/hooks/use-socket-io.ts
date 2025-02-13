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
            // Procesar bids y asks con bucketing de $10
            const BUCKET_SIZE = 10;
            const volumeByPrice = new Map<number, { volume: number; side: 'bid' | 'ask' }>();

            // Procesar bids
            data.bids.forEach((bid: any) => {
              const price = Math.floor(parseFloat(bid.Price) / BUCKET_SIZE) * BUCKET_SIZE;
              const volume = parseFloat(bid.Quantity);

              const existing = volumeByPrice.get(price) || { volume: 0, side: 'bid' };
              volumeByPrice.set(price, { 
                volume: existing.volume + volume,
                side: 'bid'
              });
            });

            // Procesar asks
            data.asks.forEach((ask: any) => {
              const price = Math.floor(parseFloat(ask.Price) / BUCKET_SIZE) * BUCKET_SIZE;
              const volume = parseFloat(ask.Quantity);

              const existing = volumeByPrice.get(price) || { volume: 0, side: 'ask' };
              volumeByPrice.set(price, {
                volume: existing.volume + volume,
                side: 'ask'
              });
            });

            // Convertir a array y ordenar por precio
            const profileData = Array.from(volumeByPrice.entries())
              .map(([price, data]) => ({
                price,
                volume: data.volume,
                side: data.side
              }))
              .sort((a, b) => a.price - b.price);

            // Calcular precio medio para onPriceUpdate
            if (data.bids[0] && data.asks[0]) {
              const midPrice = (parseFloat(data.bids[0].Price) + parseFloat(data.asks[0].Price)) / 2;
              if (onPriceUpdate) {
                onPriceUpdate(midPrice);
              }
            }

            onProfileData(profileData);
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