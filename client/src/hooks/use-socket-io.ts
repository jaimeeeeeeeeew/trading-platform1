import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  enabled?: boolean;
  onData?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useSocketIO({ enabled = true, onData, onError }: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      path: '/socket.io',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🟢 Socket.IO conectado - ID:', socket.id);
      setIsConnected(true);
    });

    socket.on('marketData', (data) => {
      console.log('📊 Datos de mercado recibidos via Socket.IO:');
      console.log('- Timestamp:', new Date().toISOString());
      console.log('- Datos:', JSON.stringify(data, null, 2));
      onData?.(data);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      onError?.(error);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket.IO desconectado');
      setIsConnected(false);
    });

    return () => {
      console.log('🧹 Limpiando conexión Socket.IO');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onData, onError]);

  const sendData = (data: any) => {
    if (socketRef.current?.connected) {
      console.log('📤 Enviando datos via Socket.IO:', data);
      socketRef.current.emit('localData', data);
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