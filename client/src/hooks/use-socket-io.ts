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

  useEffect(() => {
    if (!enabled) {
      console.log('Socket connection disabled');
      return;
    }

    console.log('Initializing socket connection...');
    setConnectionState('connecting');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionState('connected');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionState('disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket Error:', error);
      setConnectionState('error');
      onError?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionState('error');
      onError?.();
    });

    socket.on('orderbook_update', (data) => {
      try {
        if (!data || !data.bids || !data.asks) return;

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

        if (bids.length > 0 && asks.length > 0) {
          const midPrice = (bids[0].price + asks[0].price) / 2;
          onPriceUpdate?.(midPrice);
        }

        onProfileData?.([...bids, ...asks]);
      } catch (error) {
        console.error('Error processing orderbook data:', error);
      }
    });

    return () => {
      console.log('Cleaning up socket connection');
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [enabled, onError, onProfileData, onPriceUpdate]);

  const reconnect = () => {
    if (socketRef.current) {
      console.log('Forcing reconnection...');
      socketRef.current.connect();
    }
  };

  return {
    socket: socketRef.current,
    connectionState,
    reconnect
  };
}