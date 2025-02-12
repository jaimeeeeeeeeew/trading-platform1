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
  const maxReconnectAttempts = 10; // Aumentado de 5 a 10
  const initialReconnectDelay = 1000;
  const maxReconnectDelay = 30000;

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    console.log('🎧 Initializing socket connection...');
    setConnectionState('connecting');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['websocket'],
      timeout: 20000, // Aumentado de 10000 a 20000
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: initialReconnectDelay,
      reconnectionDelayMax: maxReconnectDelay,
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

      // Reconectar inmediatamente si la desconexión no fue intencional
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Socket Error:', error);
      setConnectionState('error');
      onError?.();
    });

    socket.on('connect_error', (error) => {
      console.log('⚠️ Connection error:', error.message);
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('🔄 Max reconnection attempts reached, stopping...');
        socket.disconnect();
        setConnectionState('error');
        onError?.();
      } else {
        const delay = Math.min(
          initialReconnectDelay * Math.pow(2, reconnectAttempts.current),
          maxReconnectDelay
        );
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
        setConnectionState('connecting');
        setTimeout(() => socket.connect(), delay);
      }
    });

    socket.on('orderbook_update', (data) => {
      try {
        if (!data || !data.bids || !data.asks) {
          console.warn('Invalid orderbook data received:', data);
          return;
        }

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

          // Calcular precio medio y notificar
          if (bids.length > 0 && asks.length > 0) {
            const midPrice = (bids[0].price + asks[0].price) / 2;
            if (onPriceUpdate) {
              onPriceUpdate(midPrice);
            }
          }

          onProfileData([...bids, ...asks]);
        }
      } catch (error) {
        console.error('Error processing orderbook data:', error);
      }
    });

    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [enabled, onError, onProfileData, onPriceUpdate]);

  const reconnect = () => {
    if (socketRef.current) {
      console.log('🔄 Forcing reconnection...');
      reconnectAttempts.current = 0;
      socketRef.current.connect();
    }
  };

  return {
    connectionState,
    socket: socketRef.current,
    reconnect
  };
}