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
  const maxReconnectAttempts = 15; // Aumentado a 15 intentos
  const initialReconnectDelay = 500; // Reducido el delay inicial
  const maxReconnectDelay = 10000; // Reducido el máximo delay

  useEffect(() => {
    if (!enabled) {
      console.log('WebSocket disabled');
      return;
    }

    console.log('🎧 Initializing socket connection...');
    setConnectionState('connecting');

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      transports: ['websocket', 'polling'], // Habilitado polling como fallback
      timeout: 5000, // Reducido el timeout para detectar problemas más rápido
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

      // Reconectar inmediatamente en caso de desconexión del servidor
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Immediate reconnection attempt...');
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
          initialReconnectDelay * Math.pow(1.5, reconnectAttempts.current), // Backoff más gradual
          maxReconnectDelay
        );
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
        setConnectionState('connecting');

        // Intentar reconectar con el nuevo transport si el actual falla
        if (socket.io.engine?.transport?.name === 'websocket') {
          console.log('⚡ Falling back to polling transport...');
          socket.io.engine.transport.name = 'polling';
        }

        setTimeout(() => {
          if (socketRef.current === socket) { // Verificar que aún es el socket actual
            socket.connect();
          }
        }, delay);
      }
    });

    socket.on('orderbook_update', (data) => {
      try {
        if (!data || !data.bids || !data.asks) {
          console.warn('Invalid orderbook data:', data);
          return;
        }

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

        // Calcular y notificar precio medio
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