import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  enabled?: boolean;
  onData?: (data: any) => void;
  onProfileData?: (data: ProfileData[]) => void;
  onError?: (error: any) => void;
}

interface ProfileData {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  total: number;
}

export function useSocketIO({
  enabled = true,
  onData,
  onProfileData,
  onError
}: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = (socket: Socket) => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    heartbeatInterval.current = setInterval(() => {
      if (socket.connected) {
        console.log('💓 Enviando heartbeat...');
        socket.emit('heartbeat');
      }
    }, 30000);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  };

  const requestInitialData = (socket: Socket) => {
    if (socket.connected) {
      console.log('📡 Solicitando datos iniciales del orderbook...');
      socket.emit('request_orderbook');
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/trading-socket',
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      timeout: 60000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Socket.IO conectado - ID:', socket.id, 'Transport:', socket.io.engine.transport.name);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      clearReconnectTimeout();
      startHeartbeat(socket);
      requestInitialData(socket);
    });

    socket.io.engine.on('upgrade', () => {
      console.log('🔄 Transport upgraded:', socket.io.engine.transport.name);
    });

    socket.on('profile_data', (data: ProfileData[]) => {
      console.log('📊 Datos de perfil recibidos:', {
        timestamp: new Date().toISOString(),
        niveles: data.length,
        muestra: data.slice(0, 3),
        transport: socket.io.engine.transport.name
      });

      if (Array.isArray(data) && data.length > 0) {
        const validData = data.every(item =>
          typeof item.price === 'number' &&
          typeof item.volume === 'number' &&
          (item.side === 'bid' || item.side === 'ask') &&
          typeof item.total === 'number'
        );

        if (validData) {
          onProfileData?.(data);
        } else {
          console.error('❌ Datos de perfil inválidos:', data);
          onError?.({ message: 'Datos de perfil inválidos' });
        }
      } else {
        console.warn('⚠️ No hay datos de perfil para procesar');
      }
    });

    socket.on('heartbeat_ack', () => {
      console.log('💓 Heartbeat confirmado');
    });

    socket.on('reconnect_needed', () => {
      console.log('⚠️ Reconexión necesaria, intentando reconectar...');
      if (!socket.connected && reconnectAttempts.current < maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`🔄 Intentando reconexión en ${backoffTime}ms...`);
        setTimeout(() => {
          socket.connect();
          reconnectAttempts.current++;
        }, backoffTime);
      }
    });

    socket.on('error', (error) => {
      console.error('❌ Error en Socket.IO:', error);
      onError?.(error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      onError?.(error);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        console.log(`🔄 Reintentando conexión en ${backoffTime}ms...`);

        clearReconnectTimeout();
        reconnectTimeout.current = setTimeout(() => {
          if (!socket.connected) {
            socket.connect();
            reconnectAttempts.current++;
          }
        }, backoffTime);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket.IO desconectado - Razón:', reason, 'Transport:', socket.io.engine.transport.name);
      setIsConnected(false);
      stopHeartbeat();

      if (reason === 'io server disconnect' || reason === 'transport close') {
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Reintentando conexión en ${backoffTime}ms...`);

          clearReconnectTimeout();
          reconnectTimeout.current = setTimeout(() => {
            if (!socket.connected) {
              socket.connect();
              reconnectAttempts.current++;
            }
          }, backoffTime);
        }
      }
    });

    return () => {
      console.log('🧹 Limpiando conexión Socket.IO');
      stopHeartbeat();
      clearReconnectTimeout();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onProfileData, onError]);

  const sendData = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📤 Enviando datos via Socket.IO:', {
        timestamp: new Date().toISOString(),
        transport: socketRef.current.io.engine.transport.name
      });
      socketRef.current.emit('orderbook_data', data);
    } else {
      console.warn('⚠️ Socket.IO no está conectado, no se pueden enviar datos');
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current,
  };
}