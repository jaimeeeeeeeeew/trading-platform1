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
  const maxReconnectAttempts = 10; // Aumentado a 10 intentos
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageBufferRef = useRef<any[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);

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
      messageBufferRef.current = [];
    };

    const processBufferedMessages = () => {
      console.log('Processing buffered messages:', messageBufferRef.current.length);
      while (messageBufferRef.current.length > 0) {
        const msg = messageBufferRef.current.shift();
        if (msg && socketRef.current) {
          socketRef.current.emit(msg.type, msg.data);
        }
      }
    };

    const initializeSocket = () => {
      console.log('🎧 Initializing socket connection...');
      setConnectionState('connecting');

      cleanup();

      const socket = io(window.location.origin, {
        path: '/trading-socket',
        transports: ['websocket'],
        timeout: 60000,           // Aumentado a 60 segundos
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 2000,  // 2 segundos inicial
        reconnectionDelayMax: 10000, // Máximo 10 segundos
        randomizationFactor: 0.5,
        autoConnect: true,
        forceNew: true
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🟢 Connected to server');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        setIsReconnecting(false);

        if (messageBufferRef.current.length > 0) {
          processBufferedMessages();
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('🔴 Disconnected from server:', reason);
        setConnectionState('disconnected');

        if (reason === 'io server disconnect') {
          setIsReconnecting(true);
          socket.connect();
        }
      });

      socket.on('orderbook_update', (data) => {
        try {
          console.log('📊 Received orderbook update:', data);

          if (isReconnecting) {
            messageBufferRef.current.push({ type: 'orderbook_update', data });
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

            console.log('📗 Top 5 Bids:', bids.slice(0, 5));
            console.log('📕 Top 5 Asks:', asks.slice(0, 5));

            const midPrice = (parseFloat(data.bids[0]?.Price || '0') + parseFloat(data.asks[0]?.Price || '0')) / 2;
            if (midPrice && onPriceUpdate) {
              onPriceUpdate(midPrice);
            }

            onProfileData([...bids, ...asks]);
            console.log('📊 Volume Profile Data:', {
              levels: bids.length + asks.length,
              bidLevels: bids.length,
              askLevels: asks.length,
              sampleBid: bids[0],
              sampleAsk: asks[asks.length - 1]
            });
          }
        } catch (error) {
          console.error('Error processing orderbook update:', error);
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

      socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}/${maxReconnectAttempts}`);
        setIsReconnecting(true);
      });

      socket.on('reconnect', (attempt) => {
        console.log(`🔄 Reconnected after ${attempt} attempts`);
        setIsReconnecting(false);
        processBufferedMessages();
      });

      socket.on('reconnect_failed', () => {
        console.log('❌ Failed to reconnect after all attempts');
        setIsReconnecting(false);
        messageBufferRef.current = [];
        onError?.();
      });
    };

    const handleError = () => {
      reconnectAttempts.current++;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('🔄 Max reconnection attempts reached, stopping...');
        cleanup();
        setConnectionState('error');
        setIsReconnecting(false);
        onError?.();
      } else {
        console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
        setConnectionState('connecting');
        setIsReconnecting(true);

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
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
    setIsReconnecting(false);
    if (socketRef.current) {
      console.log('🔄 Forcing reconnection...');
      socketRef.current.connect();
    }
  };

  return {
    connectionState,
    socket: socketRef.current,
    reconnect,
    isReconnecting
  };
}