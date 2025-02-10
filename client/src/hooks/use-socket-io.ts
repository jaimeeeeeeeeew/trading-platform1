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
        socket.emit('heartbeat');
      }
    }, 30000); // Heartbeat cada 30 segundos
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
    console.log('📡 Solicitando datos iniciales del orderbook...');
    socket.emit('request_orderbook');
  };

  const attemptReconnect = (socket: Socket, reason: string) => {
    if (!socket || reconnectAttempts.current >= maxReconnectAttempts) return;

    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
    console.log(`🔄 Programando reconexión en ${backoffTime}ms (intento ${reconnectAttempts.current + 1})`);

    clearReconnectTimeout();
    reconnectTimeout.current = setTimeout(() => {
      if (!socket.connected && reconnectAttempts.current < maxReconnectAttempts) {
        console.log('🔄 Intentando reconexión...');
        socket.connect();
        reconnectAttempts.current += 1;
      }
    }, backoffTime);
  };

  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/socket.io',
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      autoConnect: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Socket.IO conectado - ID:', socket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      clearReconnectTimeout();
      startHeartbeat(socket);
      requestInitialData(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      onError?.(error);

      if (error.message.includes('websocket')) {
        console.log('⚠️ Error en WebSocket, intentando polling...');
        socket.io.opts.transports = ['polling', 'websocket'];
      }

      attemptReconnect(socket, 'connect_error');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket.IO desconectado - Razón:', reason);
      setIsConnected(false);
      stopHeartbeat();

      if (
        reason === 'io server disconnect' || 
        reason === 'transport close' || 
        reason === 'transport error'
      ) {
        attemptReconnect(socket, reason);
      }
    });

    socket.on('marketData', (data) => {
      console.log('📊 Datos de mercado recibidos:', {
        timestamp: new Date().toISOString(),
        data: data
      });
      onData?.(data);
    });

    socket.on('profile_data', (data: ProfileData[]) => {
      console.log('📊 Datos de perfil recibidos:', {
        timestamp: new Date().toISOString(),
        niveles: data.length,
        muestra: data.slice(0, 3)
      });
      onProfileData?.(data);
    });

    socket.on('heartbeat', () => {
      console.log('💓 Heartbeat recibido');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log('🔄 Intento de reconexión Socket.IO:', attempt);
    });

    socket.on('reconnect', (attempt) => {
      console.log('🟢 Socket.IO reconectado después de', attempt, 'intentos');
      requestInitialData(socket);
    });

    socket.on('error', (error) => {
      console.error('🔴 Error en Socket.IO:', error);
      onError?.(error);
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
      console.log('📤 Enviando datos via Socket.IO:', data);
      socketRef.current.emit('orderbook_data', data);
    } else {
      console.warn('⚠️ Socket.IO no está conectado, no se pueden enviar datos');

      if (socketRef.current && reconnectAttempts.current < maxReconnectAttempts) {
        console.log('🔄 Intentando reconexión antes de enviar datos...');
        attemptReconnect(socketRef.current, 'send_data_attempt');
      }
    }
  };

  return {
    isConnected,
    sendData,
    socket: socketRef.current,
  };
}