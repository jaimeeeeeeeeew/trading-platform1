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

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    console.log('🎧 Initializing socket connection...');
    setConnectionState('connecting');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['websocket', 'polling'],
      timeout: 10000,
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
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        setConnectionState('connecting');
      }
    });

    socket.on('orderbook_update', (data) => {
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